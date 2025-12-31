import app from "./app";
import { config } from "./config";

app.listen(config.port, "0.0.0.0", () => {
  console.log(`🚀 Server listening on ${config.port}`);
});
