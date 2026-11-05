# Getting ready for 3.000 users

## Short answer
Mini is enough for today's traffic: memory is at 71%, and there are no alerts. Total users don't decide the server size. What decides it is how many people are active at the same moment and how heavy their requests are. Of 3.000 registered users, usually only 5–10% (150–300 people) are online at peak.

Most of the heavy work in this app happens on the AI providers' servers, not on our database. That covers making videos, images and 3D models. Our database mostly stores records and job status, so it can handle a lot of users once the slow parts are fixed.

## Plan
1. **Fix the known slow spots first.** These are cheaper than a bigger server.
   - Move the large embedded images out of the jobs list and into file storage. Those rows are currently about 68 MB for 80 jobs.
   - Make the video status checks run less often, and only while a job is still running.
   - Add indexes where the gallery and history pages need them.
2. **Load test.** Run an automated simulation of 300 people using the app at the same time: browsing, signing in, starting generations and polling. Measure memory, connections and response times on Mini.
3. **Decide the size from the results.**
   - If Mini stays under about 80% memory with fast responses, keep Mini.
   - If not, move to Small. It costs about 70% more per hour than Mini, and I'll show the exact cost before changing anything. Then move to Medium only if the load test shows it's needed.
4. **Early warning.** Before onboarding the casino customer, I'll check server health again. Upsizing takes a few minutes and can be done whenever it's needed, so there's no need to pay for a bigger server ahead of time.

## Technical details
- Cleanup: move the base64 data in `jobs` into the storage bucket and keep only URLs. Use backoff polling in the poll-video-status function. Run EXPLAIN on the gallery and history queries.
- Load test: a k6 or Playwright script against the preview, with db_health snapshots before, during and after the test.
- Resize through the approval card only, after showing the cost comparison.
