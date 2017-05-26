var fs = require('fs');
var mkdir = require('mkdirp');
var moment = require('moment');

module.exports = {
    reg: function (req, res, account_id, callback) {
        req.requestParams.ip_public  = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        var data = {
            account_id: account_id,
            params: req.requestParams,
            header: req.headers,
        };
        Activity.create(data).then((result) => {
            callback(null);
        }, error => {
            callback(error);
        });
    }
}