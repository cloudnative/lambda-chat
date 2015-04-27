console.log('Loading event');
var aws = require('aws-sdk');
var ddb = new aws.DynamoDB(
    {endpoint: 'https://preview-dynamodb.us-east-1.amazonaws.com/',
     params: {TableName: 'lambdachat'}});
 
exports.handler = function(event, context) {
    var message_id = event.Records[0].Sns.MessageId;
    var timestamp = event.Records[0].Sns.Timestamp;
    var payload = JSON.parse(event.Records[0].Sns.Message);
    var channel = 'default';
    if ("channel" in payload) {
        channel = payload.channel;
    }
    var name = payload.name;
    var message = payload.message;
    var LambdaReceiveTime = new Date().toString();
    var itemParams = {Item: {message_id: {S: message_id},
                             timestamp: {S: timestamp},
                             channel: {S: channel},
                             name: {S: name},
                             message: {S: message}}};
    ddb.putItem(itemParams, function(err, data) {
        context.done(err,'');
    });
};
