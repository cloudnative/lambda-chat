# Lambda Chat
A chat application without servers - using only AWS Lambda, S3, DynamoDB and SNS


## Live Demo

http://lambda-chat.s3-website-us-east-1.amazonaws.com/

Please don't send a million messages through here - it does cost us money and we will turn it off if it is abused.


## How it works


<pre>    ◎ ◎
     ◡

     │(1)
     │                       ┏━━━━━━━━━━━━━━━━━━┓
     │                       ┃                  ┃
     │        (2)            ┃  Google OAuth2   ┃           (4)
     │        ┌─────────────▶┃       API        ┃◀────────────┐
     │        │              ┃                  ┃             │
     │        │              ┗━━━━━━━━━━━━━━━━━━┛             │
     ▼        ▼                                     ┏━━━━━━━━━━━━━━━━━━┓
    ┏━━━━━━━━━━━━━━━━━━┓                            ┃                  ┃
    ┃                  ┃ (3)                        ┃     AWS STS      ┃
 ┌─▶┃     Website      ┃◀──────────────────────────▶┃  AWS Web ID Fed  ┃
 │  ┃                  ┃                            ┃                  ┃
 │  ┗━━━━━━━━━━━━━━━━━━┛                            ┗━━━━━━━━━━━━━━━━━━┛
 │            │
 │            │        ┏━━━━━━━━━━━━━━━━━━┓
 │            │        ┃                  ┃
 │            └───────▶┃    SNS Topic     ┃
 │            (5)      ┃                  ┃
 │                     ┗━━━━━━━━━━━━━━━━━━┛
 │                               │
 │                               │       ┏━━━━━━━━━━━━━━━━━━┓
 │                               │       ┃                  ┃
 │                               └──────▶┃    Lambda fn1    ┃
 │                               (6)     ┃                  ┃
 │                                       ┗━━━━━━━━━━━━━━━━━━┛
 │                                                 │
 │                                                 │      ┏━━━━━━━━━━━━━━━━━━┓
 │                                                 │      ┃                  ┃
 │                                                 └─────▶┃  DynamoDB Table  ┃
 │                                                 (7)    ┃                  ┃
 │                                                        ┗━━━━━━━━━━━━━━━━━━┛
 │                                                                  │
 │                                    ┏━━━━━━━━━━━━━━━━━━┓          │
 │                                    ┃                  ┃          │
 │                                    ┃    Lambda fn2    ┃◀─────────┘
 │                                    ┃                  ┃        (8)
 │                                    ┗━━━━━━━━━━━━━━━━━━┛
 │                                              │
 │            ┏━━━━━━━━━━━━━━━━━━┓              │
 │            ┃                  ┃              │
 └────────────┃    S3 Object     ┃◀─────────────┘
 (10)         ┃                  ┃            (9)
              ┗━━━━━━━━━━━━━━━━━━┛


Created with Monodraw
</pre>

1.  The user opens their browser and go to the website which is hosted entirely on S3
2.  The user signs in with their Google account and gets back an `id_token`
3.  Using AWS Web Identity Federation in the Javascript SDK, the `id_token` is sent to get temporary AWS credentials from STS.
4.  STS verifies the token with Google
5.  The users types in a message, hits ENTER, and the website publishes the message to an SNS Topic.
6.  A Lambda function is trigged by the SNS message, which gets the contents of the message, and...
7.  Stores the message in a DynamoDB table
8.  The process of adding a new chat message to the DynamoDB table triggers another Lambda function. This requires the currently-in-preview DynamoDB Streams feature. This second Lambda function reads the last 20 messages from DynamoDB, and... 
9. Writes them to an S3 object in JSON format
10. The website polls the S3 object every second, and updates the chat box with any new messages it finds.


## Getting Started

There is a lot involved here, but we have tried to make it as easy as possible for you to follow along.

### Get the code

    git clone git@github.com:cloudnative/lambda-chat.git
    cd lambda-chat

### Config

    cp config.example.yml config.yml

The only thing to edit at this point is the name of the S3 bucket to put the website in as bucket names are globally unique.

    s3_bucket: my-lambda-chat-bucket

### Google OAuth

To be able to use AWS Web Identity Federation, you will need to create a new Google Project and create credentials.

1.  Go to: https://console.developers.google.com/project
1.  Create a new project
1.  Enable **Google+ API**
1.  Create OAuth 2 credentials. Leave the Javascript Origin empty for now
1.  Edit `config.yml` and set `google_oauth_client_id` to your Client ID

### AWS Resources

#### Prerequisites

You will need Python 2.7. On OSX using brew

    brew install python

Now we need a few Python libraries

    pip install -r requirements.txt

#### CloudFormation

There is a script called `resources.py` which will generate a CloudFormation template to bring up the AWS resources needed to run Lambda Chat.

You can see the template by running

    ./resources.py cf

If you are happy with that, the script can also launch the CloudFormation Stack. To create it in N. Virginia, run:

    ./resources.py launch --region=us-east-1

The script returns quickly because it is now up to CloudFormation to bring up the AWS resources. Login to the AWS Web Console and go to the CloudFormation section in that region. Select the `Lambda-Chat` stack, then click on the **Events** tab to see the progress and check for errors.

Once the stack is complete, run:

    ./resources.py output --region=us-east-1

and add these values to your `config.yml` file.

#### Website

The files needed to run the website need to be in S3. To get them there:

    cd s3-website
    ./update.sh

You can run this command as many times as you like, particularly if you are editing the files to see what is happening.

The script tells you the URL of the website. Open that up in your browser.

#### Lambda functions

To help with the AWS Lambda side of things, we are using
[kappa](https://github.com/garnaat/kappa).  Kappa is a CLI tool that helps with
the details of creating and managing AWS Lambda applications.  You must install
kappa before proceeding.  You can install it from PyPI using pip:

    % pip install kappa

or you can clone the kappa repo and install locally:

    % git clone git@github.com:garnaat/kappa.git
    % cd kappa
    % pip install -r requirements.txt
    % python setup.py install

Next, you must edit the config.yml files in the lambda/sns directory and the
lambda/dynamodb  directories.  The config.yml files have comments which direct
you to the parts that need to be changed.

Now create the components required for the SNS->DynamoDB Lambda function:

1. cd lambda/sns
1. run ``kappa config.yml create``
1. run ``kappa config.yml invoke``.  This will call the AWS Lambda function
   synchronously with test data and return the log data to the console.
1. run ``kappa config.yml add_event_sources``.  This will connect the SNS topic
   to your AWS Lambda function.

Finally, you need to create the components requried for the DynamoDB->S3 Lambda
function:

1. cd lambda/dynamodb
1. run ``kappa config.yml create``
1. run ``kappa config.yml invoke``.  This will call the AWS Lambda function
   synchronously with test data and return the log data to the console.
1. run ``kappa config.yml add_event_sources``.  This will connect the DynamoDB
   stream to your AWS Lambda function.


### Usage

1.  Go to the URL returned by the `update.sh` script, and login with your Google account.
1.  Use like any other chat application :-)


## Updating

You should feel free to mess around with this and update parts of it with your own code. If you do, please [let us know](https://twitter.com/intent/tweet?text=I%20am%20having%20fun%20with%20Lambda%20Chat.%20Thanks%20@CloudNativeIO).

When you are making changes to the website, you can push them to S3 by running:

    cd s3-website
    ./update.sh

For modifications to the AWS Lambda functions, run:

    % kappa config.yml update_code

in the corresponding lambda directory.


## Clean up

Delete the CloudFormation stack

    ./resources.py delete --region=us-east-1

Delete the Lambda functions

    % kappa config.yml delete

in the corresponding lambda directory.  This will delete the AWS Lambda
function, remove the event source mappings, and delete the IAM role.

## Reading, resources and other stuff

 -  [AWS Web Identity Federation playground](https://web-identity-federation-playground.s3.amazonaws.com/index.html)
 -  [Building Dynamic Dashboards Using Lambda and DynamoDB Streams: Part 1](https://medium.com/aws-activate-startup-blog/building-dynamic-dashboards-using-lambda-and-dynamodb-streams-part-1-217e2318ae17)
 -  [Kappa](https://github.com/garnaat/kappa)
 -  [Troposphere](https://github.com/cloudtools/troposphere)

