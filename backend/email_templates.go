package main

import _ "embed"

//go:embed email_templates/otp.html
var otpEmailTemplate string
