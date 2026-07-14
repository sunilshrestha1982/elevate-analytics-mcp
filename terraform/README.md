# Terraform (Optional)

This folder provides an optional baseline for deploying the service to Google Cloud Run.

## Files

- main.tf: Cloud Run service resource.
- variables.tf: Input variables.
- outputs.tf: Service URI output.

## Usage

1. Initialize Terraform:

   terraform init

2. Plan:

   terraform plan \
     -var "project_id=your-project" \
     -var "region=us-central1" \
     -var "service_name=elevate-analytics-mcp" \
     -var "image=us-central1-docker.pkg.dev/your-project/elevate-analytics/elevate-analytics-mcp:latest"

3. Apply:

   terraform apply \
     -var "project_id=your-project" \
     -var "region=us-central1" \
     -var "service_name=elevate-analytics-mcp" \
     -var "image=us-central1-docker.pkg.dev/your-project/elevate-analytics/elevate-analytics-mcp:latest"
