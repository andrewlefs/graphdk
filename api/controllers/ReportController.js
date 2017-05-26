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
        ],function(err, result) {
            if(err){
                return res.toJSON(err,null,true);
            }
            else{
                return res.toJSON('SEARCH_GRAPH_SUCCESS', result,true);
            }
        });


        // FIND Account
        function findAccount(callback){
            Accounts.findOne({account_id: params.account_id}).then((accountInfo) => {
                if (_.isEmpty(accountInfo)) {
                    return res.toJSON('SEARCH_GRAPH_FAIL','',true);
                } else{
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
                    /*
                    if(result.account.type =='facebook') {
                        findsocialFacebook(callback);
                    }else if(result.account.type =='google'){
                        findsocialGoogle(callback);
                    }
                    */
                    callback(null, accountInfo,result);
                }

            }, error => {
                callback('_FALIED');
            })
        }

                // FIND socialFacebook
        function findsocialFacebook(callback){
            if(result.account.type =='facebook') {

                SocialFacebook.findOne({account_id: params.account_id}).then((datainfo) => {
                    if (_.isEmpty(datainfo)) {
                        callback('AUTHORIZE_FACEBOOK_FAIL');
                    }else{
                        result.account.facebook_id = datainfo.facebook_id;
                        callback(null,result);
                    }
                }, error => {
                    callback('AUTHORIZE_FACEBOOK_FAIL');
                });
            }

        }
                // FIND socialGoogle
        function findsocialGoogle(callback){
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

    active_lock_account: function (req, res) {
        var params = req.requestParams;
        var rawParam = req.allParams();
        var needles = ['account_id','status'];
        if (validateRequest.requiredWeb(params, needles) == false) {
            return res.toJSON('INVALID_PARAMS','',true);
        }

        var message_type = (params.status == 'lock')?'LOCK':'UNLOCK';

        async.waterfall([
            function(callback) {
                findAccount(callback);
            }
        ],function(err, msiInfo) {
            if(err){
                return res.toJSON(err,'',true);
            }
            else{
                return res.toJSON('_SUCCESS', msiInfo,true);
            }
        });

        // FIND Account
        function findAccount(callback){
            Accounts.findOne({account_id: params.account_id}).then((result) => {

                if (_.isEmpty(result) == true) {
                    callback('_FALIED');
                } else {
                    if(result.status != params.status){
                        //last login
                            sails.models[Accounts].update({account_id: params.account_id}, {status:  params.status}).then(
                                msiInfo => {callback(null,msiInfo);}, error => {
                                    callback('_FALIED');
                                });
                    }
                    callback('_SUCCESS');
                }
            }, error => {
                callback('_FALIED');
            })
        }

    },

    active_lock_service: function (req, res) {
        var params = req.requestParams;
        var rawParam = req.allParams();
        var needles = ['account_id','status'];
        if (validateRequest.requiredWeb(params, needles) == false) {
            return res.toJSON('INVALID_PARAMS');
        }

        var message_type = (params.status == 'lock')?'LOCK':'UNLOCK';

        async.waterfall([
            function(accountInfo, callback) {
                findMSIService(accountInfo, callback);
            }
        ],function(err, msiInfo) {
            if(err){
                return res.toJSON(err);
            }
            else{
                return res.toJSON('_SUCCESS', msiInfo);
            }
        });

        // FIND MSIService
        function findMSIService(accountInfo, callback){
                var MSIService = 'msiservice' + params.app;

                if(sails.models[MSIService]){
                    sails.models[MSIService].findOne({account_id: accountInfo.account_id}).then((result) => {
                        if (_.isEmpty(result))
                        {
                            callback('AUTHORIZE_FAIL');
                        }else if(params.status == result.status){
                                    callback(null, accountInfo, result);
                                    //khoi can update
                        }else{

                            // UPDATE MSIService
                            sails.models[MSIService].update({account_id: params.account_id}, {status: params.status}).then(msiInfo => {
                                callback(null, msiInfo);
                            }, error => {
                                callback("UPDATE_CHANNEL_FAIL");
                            });
                        }
                    }, error => {
                            callback('AUTHORIZE_FAIL');
                    });
                }else{
                    callback('AUTHORIZE_FAIL');
                }
        }




    },

    update_info_account: function (req, res) {
        var params = req.requestParams;
        var needles = ['account_id'];

        if (validateRequest.requiredWeb(params, needles) == false) {
            return res.toJSON('INVALID_PARAMS');
        }

        async.waterfall([
            function(callback) {
                findAccount(callback);
            },
            function(callback) {
                updateInfoAccount(callback);
            }
        ],function(err, msiInfo) {
            if(err){
                return res.toJSON(err);
            }
            else{
                return res.toJSON('UPDATE_CHANNEL_SUCCESS', msiInfo);
            }
        });

        // AUTHORIZE
        function findAccount(callback){
            Accounts.findOne({account_id: params.account_id}).then((result) => {
                if (_.isEmpty(result)) {
                callback('AUTHORIZE_FAIL');
            } else {
                callback(null, result);
            }
        }, error => {
                callback('AUTHORIZE_FAIL');
            });
        }


        var params_update = {};
        if(params.phone != ''){
            params_update.push({phone:params.phone});
        }
        if(params.email != ''){
            params_update.push({email:params.email});
        }

        // UPDATE MSIService
        function updateInfoAccount(callback){

            Accounts.update({account_id: params.account_id}, params_update ).then(result => {
                callback(null, accountInfo, msiInfo);
            }, error => {
                    callback('AUTHORIZE_FACEBOOK_FAIL');
            });
        }
    },

    set_password: function (req, res) {
        var params = req.requestParams;
        var needles = ['password', 'account_id','type'];

        if (validateRequest.requiredWeb(params, needles) == false) {
            return res.toJSON('INVALID_PARAMS','',true);
        }

        async.waterfall([
            function(accessTokenInfo, callback) {
                findMSIService(accessTokenInfo, callback);
            },
            function(msiInfo, callback) {
                findAccount(msiInfo, callback);
            }
        ],function(err, accountInfo) {
            if(err){
                return res.toJSON(err,'',true);
            }
            else{
                return res.toJSON('CHANGE_PASSWORD_SUCCESS','',true);
            }
        });


        // FIND MSIService
        function findMSIService(accessTokenInfo, callback){
            var MSIService = 'msiservice' + params.app;

            sails.models[MSIService].findOne({msi_id: accessTokenInfo.msi_id}).then((result) => {
                if (_.isEmpty(result) == true) {
                callback('ACCESS_TOKEN_INVALID');
            } else {
                callback(null, result);
            }
        }, error => {
                callback("ACCESS_TOKEN_INVALID");
            });
        }
        var params_update = {};
        if(params.type =='temp'){
            params_update={password_temp : params.password,'update_time_temp':date};
        }else{
            params_update = {password : params.password};
        }
        // FIND Account
        function findAccount(msiInfo, callback){
            Accounts.findOne({account_id: msiInfo.account_id}).then((result) => {
                if (_.isEmpty(result) == true) {
                callback('ACCESS_TOKEN_INVALID');
            } else {
                    Accounts.update({account_id: result.account_id}, params_update).then(result => {
                        callback(null, result);
                }, error => {
                        callback("CHANGE_PASSWORD_FAIL");
                    })

            }
        }, error => {
                callback("ACCESS_TOKEN_INVALID");
            })
        }
    },

    //get info detail
    get_info: function (req, res) {
        var params = req.requestParams;
        var needles = ['access_token'];

        if (validateRequest.requiredWeb(params, needles) == false) {
            return res.toJSON('INVALID_PARAMS','',true);
        }

        var accessToken = req.userData.accessToken;
        var account_id = req.userData.account_id;

        async.waterfall([
            function(callback) {
                findAccount(callback);
            }
        ],function(err, accountInfo) {
            if(err){
                return res.toJSON(err,'',true);
            }
            else{
                return res.toJSON('GET_INFO_SUCCESS', accountInfo,true);
            }
        });

        // FIND Account
        function findAccount(callback){
            Accounts.findOne({account_id: account_id}).then((result) => {
                if (_.isEmpty(result) == true) {
                callback('GET_INFO_FAIL');
            } else {
                callback(null, {
                    account_id: result.account_id,
                    account: result.account,
                    email: result.email,
                    list_service: result.list_service
                });
            }
        }, error => {
                callback("ACCESS_TOKEN_INVALID");
            })
        }
    },


    transer_account: function (req, res) {
        var params = req.requestParams;
        var needles = ['account_id','msi_id','ref_msi', 'channel'];

        if (validateRequest.requiredWeb(params, needles) == false) {
            return res.toJSON('INVALID_PARAMS','',true);
        }

        var accessToken = req.userData.accessToken;

        async.waterfall([
            function(callback) {
                findAccount(callback);
            },
            function(callback) {
                findMSIService(callback);
            },
            function(callback) {
                updateMSIService(callback);
            }
        ],function(err, msiInfo) {
            if(err){
                return res.toJSON(err,'',true);
            }
            else{
                return res.toJSON('UPDATE_CHANNEL_SUCCESS', msiInfo,true);
            }
        });

        // FIND Account
        function findAccount(callback){
            var MSIService = 'msiservice' + params.app;

            sails.models[MSIService].findOne({msi_id: params.msi_id}).then((result) => {
                if (_.isEmpty(result) == true) {
                callback('ACCESS_TOKEN_INVALID');
            } else {
                callback(null, result);
            }
        }, error => {
                callback("ACCESS_TOKEN_INVALID");
            })
        }

        // FIND MSIService
        function findMSIService(accessTokenInfo, callback){
            var MSIService = 'msiservice' + params.app;

            sails.models[MSIService].findOne({ref_msi: params.ref_msi}).then((result) => {
                if (_.isEmpty(result) == true) {
                callback('ACCESS_TOKEN_INVALID');
            } else {
                callback(null, result);
            }
        }, error => {
                callback("ACCESS_TOKEN_INVALID");
            });
        }


        // UPDATE MSIService
        function updateMSIService(callback){
            var MSIService = 'msiservice' + params.app;

            if(sails.models[MSIService]) {
                //update account = empty
                sails.models[MSIService].update({msi_id: params.ref_msi},
                    {account_id: null}).then(msiInfo => {
                    callback(null, msiInfo);
            }, error => {
                    callback("UPDATE_CHANNEL_FAIL");
                });
                //update change account = account
                sails.models[MSIService].update({msi_id: params.msi_id},
                    {account_id: params.account_id}).then(msiInfo => {
                    callback(null, msiInfo);
            }, error => {
                    callback("UPDATE_CHANNEL_FAIL");
                });

            }
            else{
                callback("INVALID_TOKEN");
            }
        }
    },



    graph: function (req, res) {
        var params = req.requestParams;
        var rawParam = req.allParams();
        var needles = ['account_id'];
        if (validateRequest.requiredWeb(params, needles) == false) {
            return res.toJSON('INVALID_PARAMS');
        }

        Accounts.findOne({account_id: params.account_id}).then((accountInfo) => {
            if (_.isEmpty(accountInfo)) {
                return res.toJSON('SEARCH_GRAPH_FAIL');
            } else {
                var result = {
                    account: {
                        account_id: params.account_id,
                        account: accountInfo.account,
                        type: accountInfo.type || 'default',
                        status: accountInfo.status || 'lock',
                    },
                    services: {}
                };

                if(!_.isArray(accountInfo.list_service)){
                    return res.toJSON('SEARCH_GRAPH_FAIL');
                }

                _.forEach(accountInfo.list_service, function(value) {
                    result.services[value.app] = {
                        msi_id: value.msi_id,
                        createdAt: value.createdAt
                    }
                });

                return res.toJSON('SEARCH_GRAPH_SUCCESS', result);
            }
        }, error => {
            return res.toJSON('SEARCH_GRAPH_FAIL');
        });

    },

    authorize: function (req, res) {
        var params = req.requestParams;
        var needles = ['account', 'password'];

        if (validateRequest.requiredWeb(params, needles) == false) {
            return res.toJSON('INVALID_PARAMS');
        }

        params.account = _.toLower(params.account);

        async.waterfall([
            function(callback) {
                findAccount(callback);
            },
            function(accountInfo, callback) {
                findMSIService(accountInfo, callback);
            },
            function(accountInfo, msiInfo, callback) {
                createAccessToken(accountInfo, msiInfo, callback);
            }
        ],function(err, tokenInfo) {
            if(err){
                return res.toJSON(err);
            }
            else{
                return res.toJSON('AUTHORIZE_SUCCESS', tokenInfo);
            }
        });

        // AUTHORIZE
        function findAccount(callback){
            Accounts.findOne({account: params.account}).then((result) => {
                if (_.isEmpty(result)) {
                    callback('AUTHORIZE_FAIL');
                } else {
                    callback(null, result);
                }
            }, error => {
                callback('AUTHORIZE_FAIL');
            });
        }

        // FIND MSIService
        function findMSIService(accountInfo, callback){
            if (accountInfo.password == md5(params.password)) {
                var MSIService = 'msiservice' + params.app;

                if(sails.models[MSIService]){
                    sails.models[MSIService].findOne({account_id: accountInfo.account_id}).then((result) => {
                        if (_.isEmpty(result)) {
                            var msiData = {
                                account_id: accountInfo.account_id,
                                channel: params.channel,
                                platform: params.platform
                            };
                            sails.models[MSIService].create(msiData).then((msiInfo) => {
                                accountInfo.list_service = accountInfo.list_service || [];
                                accountInfo.list_service.push({
                                    app: params.app,
                                    msi_id: msiInfo.msi_id,
                                    createdAt: msiInfo.createdAt
                                });

                                Accounts.update({account_id: accountInfo.account_id}, {list_service: accountInfo.list_service}).then(result => {
                                    callback(null, accountInfo, msiInfo);
                                }, error => {
                                    callback('AUTHORIZE_FAIL');
                                });
                            }, error => {
                                callback('AUTHORIZE_FAIL');
                            });
                        }
                        else{
                            callback(null, accountInfo, result);
                        }
                    }, error => {
                        callback('AUTHORIZE_FAIL');
                    });
                }
                else{
                    callback("INVALID_TOKEN");
                }
            }
            else{
                callback('AUTHORIZE_FAIL');
            }
        }

        // SET ACCESSTOKEN
        function createAccessToken(accountInfo, msiInfo, callback){
            var accessToken = utils.generateAccessToken({msi_id: msiInfo.msi_id, account_id: accountInfo.account_id});
            var dataToken = AccessToken.getSchema(params, msiInfo.msi_id, accountInfo.account_id, accessToken);
            var MSIService = 'msiservice' + params.app;

            if(accountInfo.status == 'lock'){
                callback('ACCOUNT_LOCKED');
            }
            else{
                AccessToken.create(dataToken).then((resultAccessToken) => {
                    var tokenInfo = {
                        account_id: accountInfo.account_id,
                        access_token: resultAccessToken.access_token,
                        type: 'default'
                    };

                    //last login
                    sails.models[MSIService].update({msi_id: msiInfo.msi_id}, {last_login: new Date()}).then(msiInfo => {
                        callback(null, tokenInfo);
                    }, error => {
                        callback("AUTHORIZE_FAIL");
                    });
                }, error => {
                    callback('AUTHORIZE_FAIL');
                });
            }
        }
    },

    authorize_facebook: function (req, res) {
        var params = req.requestParams;
        var needles = ['fb_access_token'];

        if (validateRequest.requiredWeb(params, needles) == false) {
            return res.toJSON('INVALID_PARAMS');
        }

        facebookSDK.verify_token(params.fb_access_token).then(response => {
            async.waterfall([
                function(callback) {
                    findsocialFacebook(callback);
                },
                function(accountInfo, callback) {
                    findMSIService(accountInfo, callback);
                },
                function(accountInfo, msiInfo, callback) {
                    createAccessToken(accountInfo, msiInfo, callback);
                }
            ],function(err, tokenInfo) {
                if(err){
                    return res.toJSON(err);
                }
                else{
                    return res.toJSON('AUTHORIZE_FACEBOOK_SUCCESS', tokenInfo);
                }
            });

            // FIND socialFacebook
            function findsocialFacebook(callback){
                SocialFacebook.findOne({facebook_token: response.token_for_business}).then((result) => {
                    if (_.isEmpty(result)) {
                        params.type = 'facebook';
                        params.google_aid = (!_.isUndefined(req.trackingInfo.google_aid) && !_.isEmpty(req.trackingInfo.google_aid)) ? req.trackingInfo.google_aid : '';
                        Accounts.create(params).then((accountInfo) => {
                            SocialFacebook.create({
                                account_id: accountInfo.account_id,
                                facebook_id: response.id,
                                facebook_token: response.token_for_business
                            }).then(result => {
                                callback(null, accountInfo)
                            }, error => {
                                callback('AUTHORIZE_FACEBOOK_FAIL');
                            });
                        }, error => {
                            callback(error);
                        });
                    } else {
                        Accounts.findOne({account_id: result.account_id}).then((accountInfo) => {
                            if (_.isEmpty(accountInfo)) {
                                callback('AUTHORIZE_FACEBOOK_FAIL');
                            } else {
                                callback(null, accountInfo);
                            }
                        }, error => {
                            callback('AUTHORIZE_FACEBOOK_FAIL');
                        });
                    }
                }, error => {
                    callback('AUTHORIZE_FACEBOOK_FAIL');
                });
            }

            // FIND MSIService
            function findMSIService(accountInfo, callback){
                var MSIService = 'msiservice' + params.app;

                if(sails.models[MSIService]){
                    sails.models[MSIService].findOne({account_id: accountInfo.account_id}).then((result) => {
                        if (_.isEmpty(result)) {
                            var msiData = {
                                account_id: accountInfo.account_id,
                                channel: params.channel,
                                platform: params.platform
                            };
                            sails.models[MSIService].create(msiData).then((msiInfo) => {
                                accountInfo.list_service = accountInfo.list_service || [];
                                accountInfo.list_service.push({
                                    app: params.app,
                                    msi_id: msiInfo.msi_id,
                                    createdAt: msiInfo.createdAt
                                });

                                Accounts.update({account_id: accountInfo.account_id}, {list_service: accountInfo.list_service}).then(result => {
                                    callback(null, accountInfo, msiInfo);
                                }, error => {
                                    callback('AUTHORIZE_FACEBOOK_FAIL');
                                });
                            }, error => {
                                callback('AUTHORIZE_FACEBOOK_FAIL');
                            });
                        }
                        else{
                            callback(null, accountInfo, result);
                        }
                    }, error => {
                        callback('AUTHORIZE_FACEBOOK_FAIL');
                    });
                }
                else{
                    callback("INVALID_TOKEN");
                }
            }

            // SET ACCESSTOKEN
            function createAccessToken(accountInfo, msiInfo, callback){
                var accessToken = utils.generateAccessToken({msi_id: msiInfo.msi_id, account_id: accountInfo.account_id});
                var dataToken = AccessToken.getSchema(params, msiInfo.msi_id, accountInfo.account_id, accessToken);
                var MSIService = 'msiservice' + params.app;

                if(accountInfo.status == 'lock'){
                    callback('ACCOUNT_LOCKED');
                }
                else{
                    AccessToken.create(dataToken).then((resultAccessToken) => {
                        var tokenInfo = {
                            account_id: accountInfo.account_id,
                            facebook_id: response.id,
                            access_token: resultAccessToken.access_token,
                            type: 'facebook'
                        };

                        //last login
                        sails.models[MSIService].update({msi_id: msiInfo.msi_id}, {last_login: new Date()}).then(msiInfo => {
                            callback(null, tokenInfo);
                        }, error => {
                            callback("AUTHORIZE_FACEBOOK_FAIL");
                        });
                    }, error => {
                        callback('AUTHORIZE_FACEBOOK_FAIL');
                    });
                }
            }
        }, error => {
            return res.toJSON('AUTHORIZE_FACEBOOK_FAIL');
        })
    },

    authorize_google: function (req, res) {
        var params = req.requestParams;
        var needles = ['gg_access_token'];
        if (validateRequest.requiredWeb(params, needles) == false) {
            return res.toJSON('INVALID_PARAMS');
        }

        googleSDK.verify_token(params.gg_access_token).then(response => {
            async.waterfall([
                function(callback) {
                    findsocialGoogle(callback);
                },
                function(accountInfo, callback) {
                    findMSIService(accountInfo, callback);
                },
                function(accountInfo, msiInfo, callback) {
                    createAccessToken(accountInfo, msiInfo, callback);
                }
            ],function(err, tokenInfo) {
                if(err){
                    return res.toJSON(err);
                }
                else{
                    return res.toJSON('AUTHORIZE_GOOGLE_SUCCESS', tokenInfo);
                }
            });

            // FIND socialGoogle
            function findsocialGoogle(callback){
                SocialGoogle.findOne({google_id: response.id}).then((result) => {
                    if (_.isEmpty(result)) {
                        params.type = 'google';
                        params.google_aid = (!_.isUndefined(req.trackingInfo.google_aid) && !_.isEmpty(req.trackingInfo.google_aid)) ? req.trackingInfo.google_aid : '';
                        Accounts.create(params).then((accountInfo) => {
                            SocialGoogle.create({
                                account_id: accountInfo.account_id,
                                google_id: response.id,
                            }).then(result => {
                                callback(null, accountInfo)
                            }, error => {
                                callback('AUTHORIZE_GOOGLE_FAIL');
                            });
                        }, error => {
                            callback(error);
                        });
                    } else {
                        Accounts.findOne({account_id: result.account_id}).then((accountInfo) => {
                            if (_.isEmpty(accountInfo)) {
                                callback('AUTHORIZE_GOOGLE_FAIL');
                            } else {
                                callback(null, accountInfo);
                            }
                        }, error => {
                            callback('AUTHORIZE_GOOGLE_FAIL');
                        });
                    }
                }, error => {
                    callback('AUTHORIZE_GOOGLE_FAIL');
                });
            }

            // FIND MSIService
            function findMSIService(accountInfo, callback){
                var MSIService = 'msiservice' + params.app;

                if(sails.models[MSIService]){
                    sails.models[MSIService].findOne({account_id: accountInfo.account_id}).then((result) => {
                        if (_.isEmpty(result)) {
                            var msiData = {
                                account_id: accountInfo.account_id,
                                channel: params.channel,
                                platform: params.platform
                            };
                            sails.models[MSIService].create(msiData).then((msiInfo) => {
                                accountInfo.list_service = accountInfo.list_service || [];
                                accountInfo.list_service.push({
                                    app: params.app,
                                    msi_id: msiInfo.msi_id,
                                    createdAt: msiInfo.createdAt
                                });

                                Accounts.update({account_id: accountInfo.account_id}, {list_service: accountInfo.list_service}).then(result => {
                                    callback(null, accountInfo, msiInfo);
                                }, error => {
                                    callback('AUTHORIZE_GOOGLE_FAIL');
                                });
                            }, error => {
                                callback('AUTHORIZE_GOOGLE_FAIL');
                            });
                        }
                        else{
                            callback(null, accountInfo, result);
                        }
                    }, error => {
                        callback('AUTHORIZE_GOOGLE_FAIL');
                    });
                }
                else{
                    callback("INVALID_TOKEN");
                }
            }

            // SET ACCESSTOKEN
            function createAccessToken(accountInfo, msiInfo, callback){
                var accessToken = utils.generateAccessToken({msi_id: msiInfo.msi_id, account_id: accountInfo.account_id});
                var dataToken = AccessToken.getSchema(params, msiInfo.msi_id, accountInfo.account_id, accessToken);
                var MSIService = 'msiservice' + params.app;

                if(accountInfo.status == 'lock'){
                    callback('ACCOUNT_LOCKED');
                }
                else{
                    AccessToken.create(dataToken).then((resultAccessToken) => {
                        var tokenInfo = {
                            account_id: accountInfo.account_id,
                            google_id: response.id,
                            access_token: resultAccessToken.access_token,
                            type: 'google'
                        };

                        //last login
                        sails.models[MSIService].update({msi_id: msiInfo.msi_id}, {last_login: new Date()}).then(msiInfo => {
                            callback(null, tokenInfo);
                        }, error => {
                            callback("AUTHORIZE_GOOGLE_FAIL");
                        });
                    }, error => {
                        callback('AUTHORIZE_GOOGLE_FAIL');
                    });
                }
            }
        }, error => {
            return res.toJSON('AUTHORIZE_GOOGLE_FAIL');
        })
    },

    register: function (req, res) {
        var params = req.requestParams;
        var needles = ['account', 'password', 'email'];
        var data =null;
        if (validateRequest.requiredWeb(params, needles) == false) {
            return res.toJSON('INVALID_PARAMS',data,true);
        }

        if(validateRequest.validAccount(params.account) == false){
            return res.toJSON('ACCOUNT_NOT_VALID',data,true);
        }

        async.waterfall([
            function(callback) {
                findAccount({email: params.email}, function(err, result){
                    if(err == 'EMPTY'){
                        callback(null);
                    }
                    else{
                        callback('EMAIL_EXIST');
                    }
                });
            },
            function(callback) {
                findAccount({account: params.account}, function(err, result){
                    if(err == 'EMPTY'){
                        callback(null);
                    }
                    else{
                        callback('ACCOUNT_EXIST');
                    }
                });
            },
            function(callback) {
                createAccount(callback);
            },
            function(accountInfo, callback) {
                createMSIService(accountInfo, callback);
            },
            function(accountInfo, msiInfo, callback) {
                createAccessToken(accountInfo, msiInfo, callback);
            }
        ],function(err, tokenInfo) {
            if(err){
                return res.toJSON(err,data,true);
            }
            else{
                activityService.reg(req, res, tokenInfo.account_id, function (err, result) {
                    if(err){
                        return res.toJSON('SERVER_MAINTENANCE',data,true);
                    }
                    else{
                        return res.toJSON('REGISTER_SUCCESS', tokenInfo,true);
                    }
                });
            }
        });

        // FIND ACCOUNT
        function findAccount(where, callback){
            Accounts.findOne(where).then((result) => {
                if (_.isEmpty(result)) {
                    callback('EMPTY');
                } else {
                    callback(null, result);
                }
            }, error => {
                callback('REGISTER_FAIL');
            });
        }

        // CREATE ACCOUNT
        function createAccount(callback){
            params.google_aid = (!_.isUndefined(req.trackingInfo.google_aid) && !_.isEmpty(req.trackingInfo.google_aid)) ? req.trackingInfo.google_aid : '';
            params.ip = {
                user: !_.isUndefined(params.ip_user) ? params.ip_user : '',
                public: req.headers['x-forwarded-for'] || req.connection.remoteAddress
            };

            Accounts.create(params).then((result) => {
                //set ANTI_CHEAT_HACK_CREATE_ACCOUNT
                params.model = (!_.isNull(params.model) && !_.isUndefined(params.model)) ? params.model : '';
                var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
                var key_anti = 'ANTI_CHEAT_HACK_CREATE_ACCOUNT' + params.app + ip + params.platform + params.model;
                redis.set(key_anti, true, 'EX', 300);

                callback(null, result);
            }, error => {
                callback('REGISTER_FAIL');
            });
        }

        // CREATE MSIService
        function createMSIService(accountInfo, callback){
            var MSIService = 'msiservice' + params.app;

            if(sails.models[MSIService]){
                var msiData = {
                    account_id: accountInfo.account_id,
                    channel: params.channel,
                    platform: params.platform
                };
                sails.models[MSIService].create(msiData).then((msiInfo) => {
                    accountInfo.list_service = accountInfo.list_service || [];
                    accountInfo.list_service.push({
                        app: params.app,
                        msi_id: msiInfo.msi_id,
                        createdAt: msiInfo.createdAt
                    });

                    Accounts.update({account_id: accountInfo.account_id}, {list_service: accountInfo.list_service}).then(result => {
                        callback(null, accountInfo, msiInfo);
                    }, error => {
                        callback('REGISTER_FAIL');
                    });
                }, error => {
                    callback('REGISTER_FAIL');
                });
            }
            else{
                callback("INVALID_TOKEN");
            }
        }

        // SET ACCESSTOKEN
        function createAccessToken(accountInfo, msiInfo, callback){
            var accessToken = utils.generateAccessToken({msi_id: msiInfo.msi_id, account_id: accountInfo.account_id});
            var dataToken = AccessToken.getSchema(params, msiInfo.msi_id, accountInfo.account_id, accessToken);
            AccessToken.create(dataToken).then((resultAccessToken) => {
                var tokenInfo = {
                    account_id: accountInfo.account_id,
                    access_token: resultAccessToken.access_token,
                    type: 'default'
                };
                callback(null, tokenInfo);
            }, error => {
                callback('REGISTER_FAIL');
            });
        }
    },

    get_info: function (req, res) {
        var params = req.requestParams;
        var needles = ['access_token'];

        var data= null;
        if (validateRequest.requiredWeb(params, needles) == false) {
            return res.toJSON('INVALID_PARAMS',data,true);
        }

        var accessToken = req.userData.accessToken;
        var account_id = req.userData.account_id;

        async.waterfall([
            function(callback) {
                findAccount(callback);
            }
        ],function(err, accountInfo) {
            if(err){
                return res.toJSON(err,data,true);
            }
            else{
                return res.toJSON('GET_INFO_SUCCESS', accountInfo,true);
            }
        });

        // FIND Account
        function findAccount(callback){
            Accounts.findOne({account_id: account_id}).then((result) => {
                if (_.isEmpty(result) == true) {
                    callback('GET_INFO_FAIL');
                } else {
                    callback(null, {
                        account_id: result.account_id,
                        account: result.account,
                        email: result.email
                    });
                }
            }, error => {
                callback("ACCESS_TOKEN_INVALID");
            })
        }
    },

    change_password: function (req, res) {
        var params = req.requestParams;
        var needles = ['new_password', 'old_password', 'access_token'];

        var data =null;
        if (validateRequest.requiredWeb(params, needles) == false) {
            return res.toJSON('INVALID_PARAMS',data,true);
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
                return res.toJSON(err,data,true);
            }
            else{
                return res.toJSON('CHANGE_PASSWORD_SUCCESS',data,true);
            }
        });

        // FIND AcessToken
        function findAccessToken(callback){
            AccessToken.findOne({hash: md5(params.access_token)}).then((result) => {
                if (_.isEmpty(result)) {
                    callback("ACCESS_TOKEN_INVALID");
                } else {
                    callback(null, result);
                }
            }, error => {
                callback("ACCESS_TOKEN_INVALID");
            })
        }

        // FIND MSIService
        function findMSIService(accessTokenInfo, callback){
            var MSIService = 'msiservice' + params.app;

            sails.models[MSIService].findOne({msi_id: accessTokenInfo.msi_id}).then((result) => {
                if (_.isEmpty(result) == true) {
                    callback('ACCESS_TOKEN_INVALID');
                } else {
                    callback(null, result);
                }
            }, error => {
                callback("ACCESS_TOKEN_INVALID");
            });
        }

        // FIND Account
        function findAccount(msiInfo, callback){
            Accounts.findOne({account_id: msiInfo.account_id}).then((result) => {
                if (_.isEmpty(result) == true) {
                    callback('ACCESS_TOKEN_INVALID');
                } else {
                    if (result['password'] == md5(params.old_password)) {
                        Accounts.update({account_id: result.account_id}, {password: md5(params.new_password)}).then(result => {
                            callback(null, result);
                        }, error => {
                            callback("CHANGE_PASSWORD_FAIL");
                        })
                    } else {
                        callback("PASSWORD_NOT_MATCH");
                    }
                }
            }, error => {
                callback("ACCESS_TOKEN_INVALID");
            })
        }
    },

    update_info: function (req, res) {
        res.send("update_info");
    },

    update_channel: function (req, res) {
        var params = req.requestParams;
        var needles = ['access_token', 'channel'];
        var data= null;

        if (validateRequest.requiredWeb(params, needles) == false) {
            return res.toJSON('INVALID_PARAMS',data,true);
        }

        var accessToken = req.userData.accessToken;

        async.waterfall([
            function(callback) {
                updateMSIService(callback);
            }
        ],function(err, msiInfo) {
            if(err){
                return res.toJSON(err,data,true);
            }
            else{
                return res.toJSON('UPDATE_CHANNEL_SUCCESS', msiInfo,true);
            }
        });

        // UPDATE MSIService
        function updateMSIService(callback){
            var MSIService = 'msiservice' + params.app;

            if(sails.models[MSIService]) {
                sails.models[MSIService].update({msi_id: accessToken.msi_id}, {channel: params.channel}).then(msiInfo => {
                    callback(null, msiInfo);
                }, error => {
                    callback("UPDATE_CHANNEL_FAIL");
                });
            }
            else{
                callback("INVALID_TOKEN");
            }
        }
    },

    forget_password: function (req, res) {
        var params = req.requestParams;
        var needles = ['email', 'password'];
        var data =null;
        if (validateRequest.requiredWeb(params, needles, true) == false) {
            return res.toJSON('INVALID_PARAMS',data,true);
        }

        Accounts.findOne({email: params.email}).then((accountInfo) => {
            if (_.isEmpty(accountInfo) == true) {
                return res.toJSON('ACCOUNT_NOT_EXIST',data,true);
            } else {
                Accounts.update({email: params.email}, {password: md5(params.password)}).then(response => {
                    return res.toJSON('CHANGE_PASSWORD_SUCCESS',data,true);
                }, error => {
                    return res.toJSON('CHANGE_PASSWORD_FAIL',data,true);
                });
            }
        });
    },

    check_email: function (req, res) {
        var params = req.requestParams;
        var needles = ['email'];
        var data = null;

        if (validateRequest.requiredWeb(params, needles, true) == false) {
            return res.toJSON('INVALID_PARAMS',data,true);
        }

        params.email = _.toLower(params.email);
        Accounts.findOne({email: params.email}).then((accountInfo) => {
            if (_.isEmpty(accountInfo) == false) {
                return res.toJSON('ACCOUNT_EXIST', {
                    account_id: accountInfo.account_id,
                    email: accountInfo.email
                },true);
            } else {
                return res.toJSON('ACCOUNT_NOT_EXIST',data,true);
            }
        });
    },

    verify_access_token: function (req, res) {
        var params = req.requestParams;
        var needles = ['access_token'];
        var data ='';

        if (validateRequest.requiredWeb(params, needles, true) == false) {
            return res.toJSON('INVALID_PARAMS',data,true);
        }

        async.waterfall([
            function(callback) {
                findAccessToken(callback);
            },
            function(accessTokenInfo, callback) {
                findMSIService(accessTokenInfo, callback);
            },
            function(accessTokenInfo, msiInfo, callback) {
                findAccount(accessTokenInfo, msiInfo, callback);
            }
        ],function(err, accountInfo) {
            if(err){
                return res.toJSON(err,data,true);
            }
            else{
                return res.toJSON('VERIFY_ACCESS_TOKEN_SUCCESS', accountInfo,true);
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
                        callback(null, accessTokenInfo, result);
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
        function findAccount(accessTokenInfo, msiInfo, callback){
            var MSIService = 'msiservice' + accessTokenInfo.service_id;

            Accounts.findOne({account_id: msiInfo.account_id}).then((result) => {
                if (_.isEmpty(result) == true) {
                    callback('VERIFY_ACCESS_TOKEN_FAIL');
                } else {
                    if(result.status == 'lock'){
                        callback('ACCOUNT_LOCKED');
                    }
                    else{
                        //last login
                        sails.models[MSIService].update({msi_id: msiInfo.msi_id}, {last_login: new Date()}).then(msiInfo => {
                            callback(null, {
                                account_id: result.account_id,
                                account: result.account,
                                email: result.email,
                                channel: result.channel,
                                device_id: result.device_id,
                                type: result.type
                            });
                        }, error => {
                            callback("VERIFY_ACCESS_TOKEN_FAIL");
                        });
                    }
                }
            }, error => {
                callback("VERIFY_ACCESS_TOKEN_FAIL");
            })
        }
    },

    logout: function (req, res) {
        var params = req.requestParams;
        var needles = ['access_token'];
        var data = '';
        if (validateRequest.requiredWeb(params, needles, true) == false) {
            return res.toJSON('INVALID_PARAMS',data,true);
        }

        AccessToken.findOne({hash: md5(params.access_token)}).then(response => {
            if (_.isEmpty(response)) {
                res.toJSON("ACCESS_TOKEN_INVALID",data,true);
            } else {
                AccessToken.destroy({msi_id: response.msi_id}).exec(function (err) {
                    if(response.account_id){
                        AccessToken.destroy({account_id: response.account_id}).exec(function (err) {
                            res.toJSON("LOGOUT_SUCCESS",data,true);
                        }, error => {
                            res.toJSON("LOGOUT_FAIL",data,true);
                        });
                    }
                    else {
                        res.toJSON("LOGOUT_SUCCESS",data,true);
                    }
                }, error => {
                    res.toJSON("LOGOUT_FAIL",data,true);
                });
            }
        }, error => {
            res.toJSON("ACCESS_TOKEN_INVALID",data,true);
        })
    }
};

