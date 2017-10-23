const https = require('https');
const url = require('url');
const fs = require('fs');
const gunzip = require('zlib').createGunzip();
const storage = require('@google-cloud/storage')();

// gcloud beta functions deploy twoCdn --stage-bucket staging.two-cdn-no.appspot.com --trigger-http

const bucketId = 'two-cdn-gzip-content';

exports.twoCdn = (req, resp) => {
  const link = url.parse(req.url, true);
  const sortedQuery = alphabetizeQuery(link.query);
  const sortedPath = link.pathname + sortedQuery;
  const type = TYPE[link.pathname.split('.').pop()];
  const bucket = storage.bucket(bucketId);
  const bucketFile = bucket.file(sortedPath);

  bucketFile.exists().then((exists) => {
    if (exists[0]) {
      resp.setHeader('Content-Type', type);
      resp.setHeader('Vary', 'Accept-Encoding');
      resp.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
      if (req.headers['accept-encoding'] && req.headers['accept-encoding'].indexOf('gzip') === -1) {
        bucketFile.createReadStream()
          .on('response', (bucketResp) => {
            // this length is zipped not unzipped!
            // resp.setHeader('Content-Length', bucketResp.headers['content-length']);
          })
          .on('error', (err) => {
            resp.statusCode = 500;
            resp.write(resp.statusCode + ': ' + err.message);
            resp.end();
          })
          .pipe(gunzip)
          .pipe(resp);
      } else {
        resp.setHeader('Content-Encoding', 'gzip');
        bucketFile.createReadStream()
          .on('response', (bucketResp) => {
            resp.setHeader('Content-Length', bucketResp.headers['content-length']);
          })
          .on('error', (err) => {
            resp.statusCode = 500;
            resp.write(resp.statusCode + ': ' + err.message);
            resp.end();
          })
          .pipe(resp);
      }
    } else {
      resp.setHeader('Content-Type', type);
      resp.setHeader('Content-Disposition', 'inline');
      https.get('https:/' + link.path, (newRes) => {
        if (newRes.statusCode === 200) {
          const size = newRes.headers['content-length'];
          resp.setHeader('Content-Length', size);
          const writeStream = bucketFile.createWriteStream({
            gzip: true,
            public: false,
            metadata: {
              contentType: type,
              contentDisposition: 'inline'
            }
          }).on('error', (err) => {
            resp.statusCode = 500;
            resp.write(resp.statusCode + ': ' + err.message);
            resp.end();
            writeStream.end();
          }).on('finish', () => {
            bucketFile.setMetadata({
              contentEncoding: ''
            });
          });
          newRes.pipe(resp);
          newRes.pipe(writeStream);
        } else {
          resp.statusCode === newRes.statusCode;
          resp.write(resp.statusCode + ': ' + newRes.statusMessage);
          resp.end();
        }
      }).on('error', (err) => {
        resp.statusCode = 500;
        resp.write(resp.statusCode + ': ' + err.message);
        resp.end();
        writeStream.end();
      });
    }
  });
}

function alphabetizeQuery(query) {
  if (!query)
    return '';
  let sortedKeys = Object.keys(query).sort();
  let res = '?';
  for (let key of sortedKeys) {
    let value = query[key];
    if (Array.isArray(value)) {
      value = value.sort();
      for (let val of value) {
        res += key + '=' + val + '&';
      }
    } else {
      res += key + '=' + value + '&';
    }
  }
  return res.substr(0, res.length - 1);
}

const TYPE = {
  js: 'application/javascript',
  css: 'text/css',
  html: 'text/html',
  json: 'application/json',
  map: 'application/octet-stream'
}

/**
 * ECONOMICAL/TECHNICAL ISSUES
 * 
 * I)
 * Problem: how to remove unused resources from the bucket/cdn cache?
 * Solution: make a small database that logs what time the resource was fetched last.
 * If we cache the resource once every year, then if the resource has not been
 * fetched since the last 2 years, then we remove it. A small serverside program
 * would check this db once every day and then delete the file from the bucket. The
 * cdn cache should already have been purged.
 * the 2cdn.no program will db.set(link, timestamp) every time it retrieves a url -> file from the bucket.
 * the 2cdn.no program will db.set(link, timestamp) every time it adds a url -> file to the bucket.
 * 
 * II)
 * Problem: How to avoid too much traffic that we cant pay for?
 * Solution 1: Have a whitelist and blacklist of urls in a db that 2cdn should accept.
 * Resources in whitelist are always added. Resources in blacklist are removed. We
 * can also have a greylist. Resource in greylist are just forwarded (slow and unsafe).
 * Solution 2: Check the referer of the request headers. If the referer is a paying
 * customer, add a CORS header to the referer. If not a a blocking CORS header.
 * Solution 3: mix whitelists of solution 1,2
 */