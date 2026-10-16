process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
process.env.ADMIN_API_KEY = "test-admin-key";

const app = require("../src/app");

// Starts the Express app on an ephemeral port. None of the tests touch MongoDB:
// they only exercise code paths that respond before any database call.
const start = () =>
  new Promise((resolve) => {
    const server = app.listen(0, () => {
      const base = `http://127.0.0.1:${server.address().port}`;
      resolve({
        base,
        close: () => new Promise((r) => server.close(r)),
        post: (path, body, headers = {}) =>
          fetch(base + path, {
            method: "POST",
            headers: { "content-type": "application/json", ...headers },
            body: JSON.stringify(body ?? {}),
          }),
        get: (path, headers = {}) => fetch(base + path, { headers }),
      });
    });
  });

module.exports = { start };
