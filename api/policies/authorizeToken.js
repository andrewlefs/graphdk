var _ = require('lodash');
var md5 = require('md5');
//var Redis = require('ioredis');

module.exports = function (req, res, next) {
  var params = req.allParams();
  var headers = req.headers;
  delete params['id'];
  req.trackingInfo = {};

  logger.record("URL", req.url);
  
  if (validRequesst(params, headers) == false) {
    return res.toJSON('INVALID_REQUEST', {params: params, headers: headers}, true);
  }

  App.findOne({app: headers.app}).exec((err, appInfo) => {
    if (_.isUndefined(appInfo)) {
      return res.toJSON('INVALID_APP', null, true);
    }
    req.metaData = {
      privateKey: appInfo.private_key,
      appName: appInfo.app,
    }
    var privateKey = appInfo.private_key;
    var otp = totp.genOTP(appInfo.private_key);

    var rawValue = generateToken(params, otp, privateKey);
    //var rawValue = generateToken(params, headers.otp, privateKey);
    decryptRequest(params, privateKey).then(response => {
      //response["app"]=appInfo.app;
      response.app = appInfo.app;
      req.requestParams = response;

      if (!_.isUndefined(response.tracking_info) && !_.isEmpty(response.tracking_info)) {
        try{
          req.trackingInfo = JSON.parse(response.tracking_info);
        }
        catch(err){
          return res.toJSON('INVALID_REQUEST', {params: params, headers: headers}, true);
        }
      }

      if (headers.token == md5(rawValue)) {
		  
        return next();
      } else {
        return res.toJSON('INVALID_TOKEN', {
            raw: rawValue,
            validToken: md5(rawValue),
            requesToken: headers.token,
            otp: otp,
            time: Math.floor(Date.now() / 1000)
          }
        )
          ;
      }
    }, error => {
      return res.toJSON('INVALID_REQUEST', {params: params, headers: headers}, true);
    });
  }, error => {
    return res.toJSON('INVALID_REQUEST', {params: params, headers: headers}, true);
  });
}
function validRequesst(params, headers) {
  if (_.isEmpty(params.q) ||
    _.isEmpty(headers.app) || _.isEmpty(headers.otp) || _.isEmpty(headers.token)) {
    return false;
  }
  return true;
}

function generateToken(params, otp, private_key) {
  return decodeURIComponent(params.q) + otp + private_key;
}

function decryptRequest(params, privateKey, otp, headers) {
  return new Promise((resolve, reject) => {

    try {
      var dataDecrypted = cryptoEncrypt.decrypt(decodeURIComponent(params.q), privateKey);
      resolve(JSON.parse(dataDecrypted));
    }
    catch (error) {
      reject(error);
    }
  });
}
