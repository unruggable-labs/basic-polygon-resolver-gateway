import express from "express";
import serverAdapter from "./server-adapter";

const app = express();

console.log("Starting server...");

// Middleware to log all incoming requests
app.use((req, res, next) => {
  console.log(`Received ${req.method} request to ${req.url}`);
  next();
});

// Bind our adapter to `/` endpoint
app.use("/", serverAdapter);

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}/`);
});
