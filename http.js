const request = require("request-promise");
const tough = require("tough-cookie");
const setCookieString = (string, jar, uri) =>
  string.split(";").forEach((single) => jar.setCookie(single, uri));

function Http() {
  this.cookiejar = null;
}

Http.prototype.setCookie = function (cookie) {
  if (cookie) {
    if (this.cookiejar === null) this.cookiejar = request.jar();
    // if (this.cookiejar === null) this.cookiejar = new tough.CookieJar();
    // setCookieString(cookie, this.cookiejar, 'https://vocabulary.com/');
    setCookieString(cookie, this.cookiejar, "https://www.vocabulary.com/");
  }
};

Http.prototype.getJar = function () {
  return this.cookiejar;
};

Http.prototype.http = function (method, url, options, data) {
  const self = this;
  // console.log("cookie this ", this);
  return new Promise((resolve, reject) => {
    let requestOptions = {
      // url,
      uri: url,
      method,
      followAllRedirects: true,
      jar: self.cookiejar || true,
      resolveWithFullResponse: true,
      headers: {},
    };

    // console.log("uri: ", requestOptions.uri);
    // console.log("cookiejar: ", self.cookiejar);

    let sendReg = /PUT|POST/i;
    if (method.match(sendReg) && data) {
      requestOptions["form"] = data;
    }

    // options
    if (options) {
      if (options.referer) {
        requestOptions.headers["referer"] = options.referer;
      }
      // expect json response
      if (options.responseType === "json") requestOptions.json = true;
      // if ( options.credentials ) req.withCredentials = options.credentials;
    }

    let transformResponse = (res) => {
      // console.log(requestOptions);
      // console.log(res.body.length);
      // console.log(res.headers);
      // console.log(res.statusCode);

      // documentation: Get the full response instead of just the body

      let response = {};
      response.status = res.statusCode;

      // json --> res.response contains data
      // otherwise res.responseTe
      if (options && options.responseType === "json") {
        response.response = res.body;
      } else {
        // TODO: also populate responsetext? confusing
        response.responseText = res.body;
        response.response = res.body;
      }

      //console.log(res.body);
      return response;
    };

    let callTransformed = (f) => (a) => f(transformResponse(a));
    request(requestOptions)
      .then(callTransformed(resolve))
      .catch(callTransformed(reject));
  });
};

module.exports = Http;
