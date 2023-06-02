import cron from "node-cron";

// Define end date
const endDate = new Date(Date.UTC(2023, 5, 12)); // June 12, 2023 @ 00:00:00 UTC

function registrationUpdateJob() {
  const now = new Date();
  if (now > endDate) {
    console.log("Stopping cron job as the end date has been reached.");
    task.stop();
  } else {
    console.log("Running registration update cron job...");
    // Here is where your actual job code goes...
  }
}

// This will run the job every 4 hours
let task = cron.schedule("0 */4 * * *", registrationUpdateJob, {
  scheduled: true,
  timezone: "UTC",
});

// Call job immediately upon server start (for testing purposes)
registrationUpdateJob();

task.start();
