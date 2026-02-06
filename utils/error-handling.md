📖 README: Global Error Handling System
This PR implements a centralized error-handling architecture. Instead of writing unique try/catch logic or custom res.status().json() calls in every controller, we now use a standardized pipeline.

🛠 How to Use
1. Throwing an Expected Error
When you encounter a "Known" issue (Operational Error), import the AppError class and pass it into next().

JavaScript
const AppError = require('../utils/appError');

exports.getUser = async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    // 1. Create the error, 2. Pass to next() to trigger the global handler
    return next(new AppError('No user found with that ID', 404));
  }

  res.status(200).json({ status: 'success', data: { user } });
};
2. Handling Unexpected Errors (Bugs)
If a programming error occurs (e.g., user is undefined and you try to access user.name), the global handler will:

Detect it as a non-operational error.

Log the full stack trace to the console for us to debug.

Send a generic 500 Internal Server Error to the client to keep our internal logic secure.

🧱 Error Response Format
All errors now return a consistent JSON structure:

Operational Error (4xx):

JSON
{
  "status": "fail",
  "message": "No user found with that ID"
}
Programming/Unknown Error (500):

JSON
{
  "status": "error",
  "message": "Something went very wrong!"
}
📂 File Changes
utils/appError.js: Custom class that extends the built-in Error to include statusCode and isOperational flags.

controllers/errorController.js: The central middleware that differentiates between "Trusted" operational errors and "Untrusted" programming bugs.

app.js: Integrated the handler at the end of the middleware stack.