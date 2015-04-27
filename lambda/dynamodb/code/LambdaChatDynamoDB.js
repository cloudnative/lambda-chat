console.log('Loading function');
var async = require('async');
var aws = require('aws-sdk');
var ddb = new aws.DynamoDB(
    {endpoint: 'https://preview-dynamodb.us-east-1.amazonaws.com/',
     params: {TableName: 'lambdachat'}});
var s3 = new aws.S3();
var bucket = 'lambda-chat'


exports.handler = function(event, context) {
    console.log('Hello there...');
    console.log(event)

    async.waterfall([
        function getrecords(next) {
            console.log('Scanning the table');
            ddb.scan({Limit: 20}, next);
        },
        function buildjson(response, next) {
            console.log('Building JSON file');
            var messageData = {
                messages: []
            };
            
            for (var ii in response.Items) {
                ii = response.Items[ii];
                var message = {};
                message['id'] = ii.message_id['S'];
                message['name'] = ii.name['S'];
                message['message'] = ii.message['S'];
                messageData.messages.push(message);
            }
            next(null, JSON.stringify(messageData));
        },
        function savetos3(jsonstring, next) {
            s3.putObject({
                Bucket: bucket,
                Key: 'data.json',
                Body: jsonstring
                }, next);
        }
    ], function (err) {
        if (err) {
            console.log('got an error');
            console.log(err, err.stack);
        } else {
            console.log('Saved Data to S3');
        }
        context.done(null, '');
    });
    
};
