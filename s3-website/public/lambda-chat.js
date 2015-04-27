var webIdentityToken = null;
var sns = null;
var chatUpdateId = null;
var displayedMessages = [];
var username = 'Anonymous';

function setStateSignedOut() {
    // Toggle state to signed out
    $('#signout-button').addClass('hidden');
    $('#signed-out').show();
    $('#signed-in').hide();

    // Stop reading chat messages
    if (chatUpdateId) {
        clearInterval(chatUpdateId)
        chatUpdateId = null;
    }
}

function setStateSignedIn() {
    // Toggle state to signed in
    $('#signout-button').removeClass('hidden');
    $('#signed-out').hide();
    $('#signed-in').show();

    // Start reading the chat messages
    chatUpdateId = setInterval(updateChat, 1000);
}

function showSigninButton() {
    var options = {
        'callback' : signinCallback,
        'approvalprompt' : 'force',
        'scope' : 'profile',
        'cookiepolicy' : 'single_host_origin',
        'clientid' : google_oauth_client_id,
    };
    gapi.signin.render('renderMe', options);
}


function signinCallback(authResult) {
    if (authResult['status']['signed_in']) {
        console.log('User is signed in!');

        // Toggle state to signed in
        setStateSignedIn();

        // Get the profile details about the user
        gapi.client.load('plus', 'v1', getUserProfile)

        // Save the token
        webIdentityToken = authResult['id_token']

        setAwsConfig();

    } else {
        // Update the app to reflect a signed out user
        // Possible error values:
        //   "user_signed_out" - User is signed-out
        //   "access_denied" - User denied access to your app
        //   "immediate_failed" - Could not automatically log in the user
        console.log('Sign-in state: ' + authResult['error']);

        console.log('User is signed out');


        // Toggle state to signed out
        setStateSignedOut();
    }
}

function signOut() {
    gapi.auth.signOut();

    setStateSignedOut();
}


function setAwsConfig() {
    AWS.config.region = region
    AWS.config.credentials = new AWS.WebIdentityCredentials({
        RoleArn: website_iam_role_arn,
        RoleSessionName: 'lambda-chat',
        WebIdentityToken: webIdentityToken
    });

    // Also create an SNS
    sns = new AWS.SNS();
}


function getUserProfile() {
    gapi.client.plus.people.get({userId: 'me'}).execute(function(resp) {
        console.log('Got user details')
        console.log(resp);
        username = resp.displayName;
        setStatusBar('Welcome ' + username);
    });
}

function sendMessage(input) {
    message = input.val();
    if (message.length > 0) {
        var payload = {
            name: username,
            message: message,
        }

        var params = {
            Message: JSON.stringify(payload),
            TargetArn: sns_topic_arn
        };

        setStatusBar('Sending message to SNS');
        sns.publish(params, function(err, data) {
            if (err) {
                // an error occurred
                console.log(err, err.stack);
                setStatusBar(err);
            } else {
                // successful response
                console.log(data);
                setStatusBar('Message sent to SNS successfully');
            }
        });
    }

    // Reset the input box for the next message
    input.val('');
}


function updateChat() {
    getData().done(function(data) {
        var messageList = data['messages'];

        // Get the last message displayed
        if (displayedMessages.length > 0) {
            lastMessage = displayedMessages[displayedMessages.length - 1];
            console.log('The last message is: ');
            console.log(lastMessage);
        } else {
            lastMessage = {};
        }

        // Figure out which messages from the data to add
        msgsToAdd = [];
        for (var i = messageList.length - 1; i >= 0; i--) {
            var message = messageList[i];
            if (areMessagesEqual(message, lastMessage)) {
                break;
            }

            msgsToAdd.unshift(message);
        }

        // Now actually display the messages
        chatBody = $('#chat-body');
        for (var i = 0; i < msgsToAdd.length; i++) {
            message = msgsToAdd[i];

            msgHtml  = '<div class="row">';
            msgHtml += '  <div class="col-xs-2 text-right">';
            msgHtml += '    <b>' + message['name'] + '</b>';
            msgHtml += '  </div>';
            msgHtml += '  <div class="col-xs-10">' + message['message'] + '</div>';
            msgHtml += '</div>';

            chatBody.append(msgHtml);
            chatBody.animate({
                scrollTop: "+=" + 20 + "px"
            });

            displayedMessages.push(message);
        }
    });
}


function areMessagesEqual(msg1, msg2) {
    return msg1['name'] == msg2['name']
        && msg1['message'] == msg2['message'];
}


/**
 * Makes a call to a data file to set a data object for the chart
 * @return {JSON object}
 */
function getData() {
    return $.getJSON(data_key).then(
        function(data) {
            console.log('Data loaded');
            console.log(data);
            return data;
        }
        , function(jqXHR, textStatus, errorThrown) {
            console.log("ERROR: " + errorThrown);
            console.log(jqXHR);
        }
    );
}


function setStatusBar(text) {
    $('#status-bar').text(text);
}

// Load
$(function() {
    // Set initial state to signed out
    setStateSignedOut();

    // Add listener for signout button clicks
    $('#signout-button').click(signOut);

    // Show the sign in button
    showSigninButton();

    // Add a listener for the ENTER key on the chat message box
    $('#chat-message').keypress(function(e) {
        if (e.which == 13) {
            sendMessage($('#chat-message'));
        }
    });

    // Always get the data
    $.ajaxSetup({ cache: false });
});
