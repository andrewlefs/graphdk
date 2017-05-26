var md5 = require('md5');

module.exports = {
    verify_access_token: function (req, res) {
        var params = req.allParams();
        var needles = ['access_token'];

        if (validateRequest.required(params, needles, true) == false) {
            return res.toJSON('INVALID_PARAMS', null, true);
        }

      async.waterfall([
        function(callback) {
          findAccessToken(callback);
        },
        function(accessTokenInfo, callback) {
          findMSIService(accessTokenInfo, callback);
        },
        function(msiInfo, callback) {
          findAccount(msiInfo, callback);
        }
      ],function(err, accountInfo) {
        if(err){
          return res.toJSON(err, null, true);
        }
        else{
          return res.toJSON('VERIFY_ACCESS_TOKEN_SUCCESS', accountInfo, true);
        }
      });

      // FIND AcessToken
      function findAccessToken(callback){
        AccessToken.findOne({hash: md5(params.access_token)}).then((result) => {
          if (_.isEmpty(result)) {
            callback("VERIFY_ACCESS_TOKEN_FAIL");
          } else {
            callback(null, result);
          }
        }, error => {
          callback("VERIFY_ACCESS_TOKEN_FAIL");
        })
      }

      // FIND MSIService
      function findMSIService(accessTokenInfo, callback){
        var MSIService = 'msiservice' + accessTokenInfo.service_id;

        if(sails.models[MSIService]){
          sails.models[MSIService].findOne({msi_id: accessTokenInfo.msi_id}).then((result) => {
            if (_.isEmpty(result) == true) {
              callback('VERIFY_ACCESS_TOKEN_FAIL');
            } else {
              callback(null, result);
            }
          }, error => {
            callback("VERIFY_ACCESS_TOKEN_FAIL");
          });
        }
        else{
          callback("INVALID_TOKEN");
        }
      }

      // FIND Account
      function findAccount(msiInfo, callback){
        Accounts.findOne({account_id: msiInfo.account_id}).then((result) => {
          if (_.isEmpty(result) == true) {
            callback('VERIFY_ACCESS_TOKEN_FAIL');
          } else {
            callback(null, {
              //id: result.account_id,
              account_id: msiInfo.msi_id
            });
          }
        }, error => {
          callback("VERIFY_ACCESS_TOKEN_FAIL");
        })
      }
    },

    verify_access_token_v2: function (req, res) {
      var params = req.allParams();
      var needles = ['access_token'];

      if (validateRequest.required(params, needles, true) == false) {
        return res.toJSON('INVALID_PARAMS', null, true);
      }

      async.waterfall([
        function(callback) {
          findAccessToken(callback);
        },
        function(accessTokenInfo, callback) {
          findMSIService(accessTokenInfo, callback);
        },
		function(msiInfo, callback) {
          findAccount(msiInfo, callback);
        }
      ],function(err, accountInfo) {
        if(err){
          return res.toJSON(err, null, true);
        }
        else{
          return res.toJSON('VERIFY_ACCESS_TOKEN_SUCCESS', accountInfo, true);
        }
      });

      // FIND AcessToken
      function findAccessToken(callback){
        AccessToken.findOne({hash: md5(params.access_token)}).then((result) => {
          if (_.isEmpty(result)) {
            callback("VERIFY_ACCESS_TOKEN_FAIL");
          } else {
            callback(null, result);
          }
        }, error => {
          callback("VERIFY_ACCESS_TOKEN_FAIL");
        })
      }

      // FIND MSIService
      function findMSIService(accessTokenInfo, callback){
        var MSIService = 'msiservice' + accessTokenInfo.service_id;

        if(sails.models[MSIService]){
          sails.models[MSIService].findOne({msi_id: accessTokenInfo.msi_id}).then((result) => {
            if (_.isEmpty(result) == true) {
              callback('VERIFY_ACCESS_TOKEN_FAIL');
            } else {
              callback(null, result);
            }
          }, error => {
            callback("VERIFY_ACCESS_TOKEN_FAIL");
          });
        }
        else{
          callback("INVALID_TOKEN");
        }
      }
	  
      // FIND Account
      function findAccount(msiInfo, callback){
        Accounts.findOne({account_id: msiInfo.account_id}).then((result) => {
          if (_.isEmpty(result) == true) {
            callback('VERIFY_ACCESS_TOKEN_FAIL');
          } else {
            callback(null, {
              id: result.account_id,
              account_id: msiInfo.msi_id,
              account: result.account,
              email: result.email,
              channel: result.channel,
              device_id: result.device_id
            });
          }
        }, error => {
          callback("VERIFY_ACCESS_TOKEN_FAIL");
        })
      }
    },
	
	
	verify_access_token_get_channel: function (req, res) {
      var params = req.allParams();
      var needles = ['access_token'];

      if (validateRequest.required(params, needles, true) == false) {
        return res.toJSON('INVALID_PARAMS', null, true);
      }

      async.waterfall([
        function(callback) {
          findAccessToken(callback);
        },
        function(accessTokenInfo, callback) {
          findMSIService(accessTokenInfo, callback);
        },
		function(accessTokenInfo, callback) {
          findMSIServiceOther(accessTokenInfo, callback);
        },
		
        function(msiInfo, callback) {
          findAccount(msiInfo, callback);
        }
      ],function(err, accountInfo) {
        if(err){
          return res.toJSON(err, null, true);
        }
        else{
          return res.toJSON('VERIFY_ACCESS_TOKEN_SUCCESS', accountInfo, true);
        }
      });

      // FIND AcessToken
      function findAccessToken(callback){
        AccessToken.findOne({hash: md5(params.access_token)}).then((result) => {
          if (_.isEmpty(result)) {
          callback("VERIFY_ACCESS_TOKEN_FAIL");
        } else {
          callback(null, result);
        }
      }, error => {
          callback("VERIFY_ACCESS_TOKEN_FAIL");
        })
      }

      // FIND MSIService
      function findMSIService(accessTokenInfo, callback){
        var MSIService = 'msiservice' + accessTokenInfo.service_id;

        if(sails.models[MSIService]){
          sails.models[MSIService].findOne({msi_id: accessTokenInfo.msi_id}).then((result) => {
            if (_.isEmpty(result) == true) {
            callback('VERIFY_ACCESS_TOKEN_FAIL');
          } else {
            callback(null, result);
          }
        }, error => {
            callback("VERIFY_ACCESS_TOKEN_FAIL");
          });
        }
        else{
          callback("INVALID_TOKEN");
        }
      }
	  
	  // FIND MSIService
      function findMSIServiceOther(accessTokenInfo, callback){
        var MSIService = 'msiservice' + params.app_id;
		
		
        if(sails.models[MSIService]){
          sails.models[MSIService].findOne({account_id: accessTokenInfo.account_id}).then((result) => {
            if (_.isEmpty(result) == true) {
            callback('ACCOUNT_EXITS');
          } else {
            callback(null, result);
          }
        }, error => {
            callback("VERIFY_ACCESS_TOKEN_FAIL");
          });
        }
        else{
          callback("INVALID_TOKEN");
        }
      }


      // FIND Account
      function findAccount(msiInfo, callback){
		  console.log(msiInfo);
        Accounts.findOne({account_id: msiInfo.account_id}).then((result) => {
          if (_.isEmpty(result) == true) {
          callback('VERIFY_ACCESS_TOKEN_FAIL');
        } else {
          callback(null, {
            id: result.account_id,
            account_id: msiInfo.msi_id,
            account: result.account,
            email: result.email,
            channel: result.channel,
            device_id: result.device_id,
            type: result.type,
            platform:result.platform
          });
        }
      }, error => {
          callback("VERIFY_ACCESS_TOKEN_FAIL");
        })
      }
    },
};
