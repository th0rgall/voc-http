function Http() {
  this.firstRun = true;
}

/**
 * Detect Chrome version
 * To check whether plugin needs to apply extraHeaders infospec to modify the referrer
 * (reference: https://developer.chrome.com/extensions/webRequest#life_cycle_footnote)
 * Function from https://stackoverflow.com/questions/4900436/how-to-detect-the-installed-chrome-version
 */
Http.prototype.getChromeVersion = function () {
  var raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
  return raw ? parseInt(raw[2], 10) : false;
};

Http.prototype.setCookie = function (cookie) {
  // no-op
  // TODO: should this also be set here? -> document.cookie = cookie;
  // meant for web use
};

/**
 *
 * @param {*} method
 * @param {*} url
 * @param {*} options
 *                  {
 *                      referer: to set a specific referrer header,
 *                      reponseType:        - default document
 *                      credentials: boolean - default true
 *                  }
 * @param {*} data for POST or PUT
 */
Http.prototype.http = function (method, url, options, data) {
  /**
   * Execute an function with a modified Referer header for browser requests
   * @param {*} requestUrls list of request URL match patters that need a referer change
   */
  function setReferrerInterceptor(requestUrls) {
    function refererListener(details) {
      const i = details.requestHeaders.findIndex(
        (e) => e.name.toLowerCase() == "set-referer"
      );
      // convert set-referer to Referer
      if (i != -1) {
        details.requestHeaders.push({
          name: "Referer",
          value: details.requestHeaders[i].value,
        });
        //delete details.requestHeaders[i]; TODO: this causes problems, the reference is still used above ?
        // now it's sending
        // another way that worked is to keep a url -> referer mapping in the object and update it in http
      }
      // Firefox uses promises
      // return Promise.resolve(details);
      // Chrome doesn't. Todo: https://github.com/mozilla/webextension-polyfill

      // important: do create a new object, passing the modified argument does not work
      return { requestHeaders: details.requestHeaders };
    }

    // modify headers with webRequest hook
    if (typeof chrome !== "undefined") {
      chrome.webRequest.onBeforeSendHeaders.addListener(
        refererListener, //  function
        { urls: requestUrls }, // RequestFilter object
        ["requestHeaders", "blocking"].concat(
          this.getChromeVersion() >= 72 ? ["extraHeaders"] : []
        ) //  extraInfoSpec
      );
    } else {
      console.warn(`The chrome API is not available. You're probably not running this in the privileged environment of a web extension.
    In browser projects, this API CAN NOT be used outside of web extensions with the proper permissions. The web extension environment is needed to circumvent CORS and change request headers, both are necessary.`);
    }
  }

  if (this.firstRun) {
    setReferrerInterceptor([
      `${this.URLBASE}/progress/*`,
      `${this.URLBASE}/lists/byprofile.json`,
      `${this.URLBASE}/lists/save.json`,
      `${this.URLBASE}/lists/delete.json`,
      `${this.URLBASE}/lists/vocabgrabber/grab.json`,
      `${this.URLBASE}/lists/load.json`,
    ]);
    this.firstRun = false;
  }

  return new Promise((resolve, reject) => {
    let req = new XMLHttpRequest();
    req.open(method.toUpperCase(), url, true);
    // headers
    req.withCredentials = true;
    req.setRequestHeader("X-Requested-With", "XMLHttpRequest");
    let sendReg = /PUT|POST/i;
    if (method.match(sendReg)) {
      req.setRequestHeader(
        "Content-Type",
        "application/x-www-form-urlencoded; charset=UTF-8"
      );
    }
    // defaults
    req.responseType = "document";
    req.withCredentials = true;
    // options
    if (options) {
      if (options.referer) {
        req.setRequestHeader("set-referer", options.referer);
      }
      if (options.responseType) req.responseType = options.responseType;
      if (options.credentials) req.withCredentials = options.credentials;
    }
    // generic response handler
    req.addEventListener("load", (response) => {
      resolve(req);
    });
    // send request
    if (method.match(sendReg)) {
      req.send(data);
    } else {
      req.send();
    }
  });
};

module.exports = Http;
