import {PushEvent, PushEventSchema} from "utils/validation/github";

export default async function handlePushEvent(payload_data: any): Promise<void> {
  const payload = PushEventSchema.parse(payload_data) as PushEvent;

  // TODO: Finish implementation, replacing the scheduler with push model.
  console.log(payload);
}
