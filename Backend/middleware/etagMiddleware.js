const etag = require('etag');

/**
 * ETag middleware for public cacheable endpoints.
 * Intercepts res.json to compute an ETag from the response body.
 * Returns HTTP 304 if the client's If-None-Match header matches.
 */
const etagMiddleware = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    const bodyStr = JSON.stringify(body);
    const tag = etag(bodyStr);

    res.set('ETag', tag);

    if (req.headers['if-none-match'] === tag) {
      return res.status(304).end();
    }

    return originalJson(body);
  };

  next();
};

module.exports = { etagMiddleware };
