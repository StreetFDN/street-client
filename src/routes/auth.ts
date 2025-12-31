import { Router, Request, Response } from 'express';
import { Octokit } from '@octokit/rest';
import { config } from '../config';
import { prisma } from '../db';

const router = Router();

/**
 * GET /api/auth/github
 * Initiate GitHub OAuth flow
 */
router.get('/github', (req: Request, res: Response) => {
  if (!config.github.clientId) {
    return res.status(500).json({ error: 'GitHub OAuth not configured' });
  }

  const redirectUri = `${config.baseUrl}/api/auth/github/callback`;
  const state = Math.random().toString(36).substring(7); // Simple state for CSRF protection
  
  if (!req.session) {
    req.session = {} as any;
  }
  req.session.oauthState = state;
  
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${config.github.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user&state=${state}`;
  
  res.redirect(githubAuthUrl);
});

/**
 * GET /api/auth/github/callback
 * Handle GitHub OAuth callback
 */
router.get('/github/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    // Verify state
    if (!state || !req.session || state !== req.session.oauthState) {
      return res.status(400).json({ error: 'Invalid state parameter' });
    }

    if (!code) {
      return res.status(400).json({ error: 'No authorization code provided' });
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: config.github.clientId,
        client_secret: config.github.clientSecret,
        code: code as string,
      }),
    });

    const tokenData = await tokenResponse.json() as { access_token?: string; error?: string; error_description?: string };

    if (tokenData.error) {
      return res.status(400).json({ error: tokenData.error_description || 'Failed to get access token' });
    }

    if (!tokenData.access_token) {
      return res.status(400).json({ error: 'No access token received' });
    }

    const accessToken = tokenData.access_token;

    // Get user info from GitHub
    const octokit = new Octokit({ auth: accessToken });
    const { data: githubUser } = await octokit.rest.users.getAuthenticated();

    // Create or update user in database
    const user = await prisma.user.upsert({
      where: { githubId: githubUser.id },
      create: {
        githubId: githubUser.id,
        githubLogin: githubUser.login,
        name: githubUser.name || githubUser.login,
        email: githubUser.email || undefined,
        avatarUrl: githubUser.avatar_url,
        accessToken: accessToken, // In production, encrypt this
      },
      update: {
        githubLogin: githubUser.login,
        name: githubUser.name || githubUser.login,
        email: githubUser.email || undefined,
        avatarUrl: githubUser.avatar_url,
        accessToken: accessToken,
      },
    });

    // Set session
    if (!req.session) {
      req.session = {} as any;
    }
    req.session.userId = user.id;
    req.session.user = {
      id: user.id,
      githubLogin: user.githubLogin,
      name: user.name || undefined,
      email: user.email || undefined,
      avatarUrl: user.avatarUrl || undefined,
    };

    // Redirect to frontend
    res.redirect('/');
  } catch (error) {
    console.error('Error in GitHub OAuth callback:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', (req: Request, res: Response) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  res.json(req.session.user || { id: req.session.userId });
});

/**
 * POST /api/auth/logout
 * Logout current user
 */
router.post('/logout', (req: Request, res: Response) => {
  req.session?.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

export default router;
