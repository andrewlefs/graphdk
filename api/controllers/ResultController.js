var md5 = require('md5');
var _ = require('lodash');

module.exports = {
    search: function (req, res) {
        var params = req.requestParams;
        var rawParam = req.allParams();
        var needles = ['account_id'];

        if (validateRequest.requiredWeb(params, needles) == false) {
            return res.toJSON('INVALID_PARAMS','',true);
        }
        var result = {};

        async.waterfall([
            function(callback) {
                findAccount(callback);
            },
            function (callback) {
                findsocialFacebook(callback);
            },
            function (callback) {
                findsocialGoogle(callback);
            },
            function(accountInfo, callback) {
                findMSIService(accountInfo, callback);
            },
        ],function(err, tokenInfo) {
            if(err){
                return res.toJSON(err ,tokenInfo, true);
            }
            else{
                return res.toJSON('AUTHORIZE_SUCCESS', tokenInfo ,true);
            }
        });


        // FIND Account
        function findAccount(callback){
            Accounts.findOne({account_id: params.account_id}).then((accountInfo) => {
                if (_.isEmpty(accountInfo)) {
                    return res.toJSON('SEARCH_GRAPH_FAIL','',true);
                }else{
                    /*
                     map data facebook_id or google_id
                     */
                    result = {
                        account: {
                            account_id: params.account_id,
                            account: accountInfo.account,
                            type: accountInfo.type || 'default',
                            status: accountInfo.status || 'lock',
                            date_create: accountInfo.createdAt,
                            email: accountInfo.email,
                            device_id: accountInfo.device_id,
                            channel: accountInfo.channel
                        },
                        services: {}
                    };

                    callback(null,accountInfo);
                }

            }, error => {
                callback('FALIED');
            })
        }

                // FIND socialFacebook
        function findsocialFacebook(callback){
            //if(result.account.type =='facebook') {

                SocialFacebook.findOne({account_id: params.account_id}).then((datainfo) => {
                    if (_.isEmpty(datainfo)) {
                        callback('AUTHORIZE_FACEBOOK_FAIL');
                    }else{
                        result.account.facebook_id = datainfo.facebook_id;
                        //console.log(result);
                        //callback('AUTHORIZE_FACEBOOK_FAIL');
                        callback(null);
                    }
                }, error => {
                    callback('AUTHORIZE_FACEBOOK_FAIL');
                });
           // }

        }
                // FIND socialGoogle
        function findsocialGoogle(callback){
            console.log('bypasss');
            if(result.account.type =='google') {
                SocialGoogle.findOne({account_id: params.account_id}).then((datainfo) => {
                    if (_.isEmpty(datainfo)) {
                        callback('AUTHORIZE_GOOGLE_FAIL');
                    }else{
                        result.account.google_id = datainfo.google_id;
                        callback(null, datainfo);
                    }
                }, error => {
                    callback('AUTHORIZE_GOOGLE_FAIL');
                });
            }
        }

                // FIND MSIService

        function findMSIService(accountInfo , callback){
            console.log('sss');
            console.log(accountInfo);
            console.log(result);
            console.log('f');
            _.forEach(accountInfo.list_service, function(value) {
                var MSIService = 'msiservice' + value.app;

                if(sails.models[MSIService]){
                    sails.models[MSIService].findOne({account_id: accountInfo.account_id}).then((result_data) => {
                        if (!_.isEmpty(result_data)) {

                            result.services[value.app] = {
                                app: params.app,
                                msi_id: result_data.msi_id,
                                createdAt: result_data.createdAt,
                                channel : result_data.channel,
                                platform : result_data.platform,
                                last_login : result_data.last_login,
                                status : result_data.status
                            };


                        }
                    }, error => {
                        callback('AUTHORIZE_FACEBOOK_FAIL');
                    });
                }

            });

            callback('SEARCH_GRAPH_SUCCESS', result);

        }


    },

};

