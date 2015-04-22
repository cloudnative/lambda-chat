var web_identity_token = null;

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
    console.log('signinCallback() START');
    console.log(authResult);

    if (authResult['status']['signed_in']) {
        console.log('User is signed in!');

        // Toggle state to signed in
        setStateSignedIn();

        // Get the profile details about the user
        gapi.client.load('plus', 'v1', getUserProfile)

        // Save the token
        web_identity_token = authResult['id_token']

        getAwsCredentials();
        // AWS.config.credentials = new AWS.WebIdentityCredentials({
        //     RoleArn: 'arn:aws:iam::1234567890:role/WebIdentity',
        //     WebIdentityToken: authResult['id_token']
        // });

        // console.log('Temporary AWS credentials are:')
        // console.log(AWS.config.credentials)

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

    console.log('signinCallback() END');
}


function getAwsCredentials() {
    var params = {
        RoleArn: website_iam_role_arn,
        RoleSessionName: 'lambda-chat',
        WebIdentityToken: web_identity_token
    };
    console.log('Setting AWS credentials')
    var sts = new AWS.STS();
    sts.assumeRoleWithWebIdentity(params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else     console.log(data);           // successful response
    });
}


function getUserProfile() {
    gapi.client.plus.people.get({userId: 'me'}).execute(function(resp) {
        console.log('Got user details')
        console.log(resp);
    });
}

function setStateSignedOut() {
    // Toggle state to signed out
    $('#signout-button').addClass('hidden');
    $('#signed-out').show();
    $('#signed-in').hide();
}

function setStateSignedIn() {
    // Toggle state to signed in
    $('#signout-button').removeClass('hidden');
    $('#signed-out').hide();
    $('#signed-in').show();
}

function signOut() {
    console.log('signOut() START');
    gapi.auth.signOut();

    setStateSignedOut();

    console.log('signOut() END');
}


// Load
$(function() {
    // Set initial state to signed out
    setStateSignedOut();

    // Add listener for signout button clicks
    $('#signout-button').click(signOut);

    // Show the sign in button
    showSigninButton();
});
