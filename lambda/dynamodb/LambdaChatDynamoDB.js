console.log('Loading function');
var aws = require('aws-sdk');
var ddb = new aws.DynamoDB(
    {endpoint: 'https://preview-dynamodb.us-east-1.amazonaws.com/',
     params: {TableName: 'lambdachat'}});
//var s3 = new aws.S3();
//var bucket = 'lambdachat'


exports.handler = function(event, context) {
    console.log('Hello there...');
    ddb.scan({Limit: 20}, function(err, data) {
        if (err) {
            console.log('got an error');
            console.log(err, err.stack);
        } else {
            console.log(data);
            var messageData = {
                messages: []
            };

            for (var ii in data.Items) {
                ii = data.Items[ii];
                var message = {};
                message['id'] = ii.message_id['S'];
                message['name'] = ii.name['S'];
                message['message'] = ii.message['S'];
                console.log(message);
                messageData.messages.push(message);
            }
            console.log(JSON.stringify(messageData));
            context.done(null, '');
        }
    });
    
};
