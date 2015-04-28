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
echo "Loading configuration file: ./config.yml"
source ./yaml2shell.sh
eval $(parse_yaml ./config.yml)
echo "Configuration loaded"

echo "Uploading the presentation files to S3..."
aws s3 sync --region ${region} --exclude "*public*" --no-follow-symlinks presentation/ s3://${s3_bucket}/presentation/

echo "-- DONE --"
echo "Go to: http://${s3_bucket}.s3-website-${region}.amazonaws.com/presentation/"
