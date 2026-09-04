#!/usr/bin/env bash
set -euo pipefail

# Redeploys the Vertex AI 429 Optimizer to Cloud Run, building directly from
# this repo's Dockerfile. Replaces the prior Google AI Studio-managed
# deployment (which used a GEMINI_API_KEY env var behind an nginx proxy
# sidecar) with this repo's Express backend, which authenticates to Vertex AI
# via the attached service account's Application Default Credentials --
# no API key is used or stored.
#
# Settings (region, resources, scaling, ingress, service account) mirror the
# prior deployment of this same Cloud Run service.

PROJECT="${GOOGLE_CLOUD_PROJECT:-landing-zone-demo-341118}"
REGION="${DEPLOY_REGION:-us-west1}"
SERVICE="${DEPLOY_SERVICE:-vertex-ai-429-optimizer}"
VERTEX_LOCATION="${GOOGLE_CLOUD_LOCATION:-global}"
SERVICE_ACCOUNT="854735162550-compute@developer.gserviceaccount.com"

gcloud run deploy "${SERVICE}" \
  --project "${PROJECT}" \
  --region "${REGION}" \
  --source . \
  --service-account "${SERVICE_ACCOUNT}" \
  --allow-unauthenticated \
  --ingress internal-and-cloud-load-balancing \
  --cpu 1 \
  --memory 3Gi \
  --min-instances 0 \
  --max-instances 100 \
  --concurrency 1000 \
  --timeout 300 \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=${PROJECT},GOOGLE_CLOUD_LOCATION=${VERTEX_LOCATION}"
