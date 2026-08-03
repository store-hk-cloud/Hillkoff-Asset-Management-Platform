import { spawnSync } from "node:child_process";

const isDryRun = process.argv.includes("--dry-run");
const projectId = process.env.GOOGLE_CLOUD_PROJECT?.trim();
const bucket = process.env.FIRESTORE_BACKUP_BUCKET?.trim();
const backupPrefix =
  process.env.FIRESTORE_BACKUP_PREFIX?.trim() ??
  `firestore/${new Date().toISOString().replace(/[:.]/g, "-")}`;

if (!projectId) {
  throw new Error("GOOGLE_CLOUD_PROJECT is required.");
}

if (!bucket || !/^gs:\/\/[a-z0-9][a-z0-9._-]{2,62}$/.test(bucket)) {
  throw new Error(
    "FIRESTORE_BACKUP_BUCKET must be a Google Cloud Storage bucket such as gs://hillkoff-firestore-backups.",
  );
}

if (!/^[a-zA-Z0-9][a-zA-Z0-9_./-]{0,199}$/.test(backupPrefix)) {
  throw new Error("FIRESTORE_BACKUP_PREFIX contains unsupported characters.");
}

const destination = `${bucket}/${backupPrefix}`;
const args = [
  "firestore",
  "export",
  destination,
  `--project=${projectId}`,
  "--database=(default)",
  "--async",
];

console.log(
  `${isDryRun ? "DRY RUN: " : ""}Firestore export target: ${destination}`,
);

if (isDryRun) {
  console.log(`Command: gcloud ${args.join(" ")}`);
  process.exit(0);
}

if (process.env.CONFIRM_FIRESTORE_BACKUP !== "true") {
  throw new Error(
    "Set CONFIRM_FIRESTORE_BACKUP=true for an actual export. Use --dry-run to validate configuration.",
  );
}

const result = spawnSync("gcloud", args, {
  stdio: "inherit",
  shell: false,
  windowsHide: true,
});

if (result.error) throw result.error;
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
