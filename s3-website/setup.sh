#!/bin/bash
# Copyright 2015 CloudNative, Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

# Stop execution if something goes wrong
set -e

# Read configuration details and set them as environment variables
echo "Loading configuration file: ../config.yml"
source ../yaml2shell.sh
eval $(parse_yaml ../config.yml)
echo "Configuration loaded"

echo "Creating an S3 bucket called '${s3_bucket}' in '${region}' for hosting the static website..."
aws s3 mb --region ${region} s3://${s3_bucket}/

echo "Setting the S3 bucket up to host a static website..."
aws s3 website  --region ${region} s3://${s3_bucket}/ --index-document 'index.html' --error-document 'error.html'

echo "Add an S3 bucket policy that allows public read access to the website..."
cat > ../tmp/s3-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicAccess",
      "Effect": "Allow",
      "Principal": "*",
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::${s3_bucket}/*"
      ]
    }
  ]
}
EOF
aws s3api put-bucket-policy --bucket ${s3_bucket} --policy file://../tmp/s3-policy.json

echo "Upload the website files to S3..."
aws s3 sync --region ${region} public/ s3://${s3_bucket}/

echo "-- DONE --"

echo "The website is now available at: http://${s3_bucket}.s3-website-${region}.amazonaws.com"
echo "If you have not already, please edit the config.yml file, and then run ./update.sh"


