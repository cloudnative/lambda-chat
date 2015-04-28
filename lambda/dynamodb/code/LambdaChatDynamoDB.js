console.log('Loading function');
var async = require('async');
var aws = require('aws-sdk');
var ddb = new aws.DynamoDB(
    {endpoint: 'https://preview-dynamodb.us-east-1.amazonaws.com/',
     params: {TableName: 'lambdachat'}});
var s3 = new aws.S3();
// change bucket name to match your bucket name
var bucket = 'lambda-chat';
var keyname = 'data.json';


exports.handler = function(event, context) {
    console.log('Handle DynamoDB Streams event');
    console.log(event);
    var new_object = event.Records[0].Dynamodb;
    var channel = 'default';
    if ('channel' in new_object.NewImage) {
        channel = new_object.NewImage.channel.S;
    }
    console.log('channel = ' + channel);


    async.waterfall([
        function getrecords(next) {
            var params = {
                "IndexName": "channel-timestamp-index",
                "KeyConditions": {
                    "channel": {
                        "AttributeValueList": [{
                            "S": 'default'
                        }],
                        "ComparisonOperator": "EQ"
                    }

                },
                "Limit": "20",
            }            
            console.log('Scanning the table');
            ddb.query(params, next);
        },
        function buildjson(response, next) {
            console.log('Building JSON file');
            console.log(response);
            var messageData = {
                messages: []
            };
            
            for (var ii in response.Items) {
                ii = response.Items[ii];
                var message = {};
                message['id'] = ii.message_id['S'];
                message['name'] = ii.name['S'];
                message['message'] = ii.message['S'];
                message['channel'] = ii.message['S'];
                messageData.messages.push(message);
            }
            next(null, JSON.stringify(messageData));
        },
        function savetos3(jsonstring, next) {
            s3.putObject({
                Bucket: bucket,
                Key: keyname,
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
        context.done(err, '');
    });
    
};
