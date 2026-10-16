#!/usr/bin/env bash
# Build InScene with Cloud Build, push to Artifact Registry and deploy to Cloud Run.
#
# Usage:
#   PROJECT_ID=my-project REGION=us-central1 ./scripts/deploy-cloud-run.sh
#
# Prerequisites (one time):
#   gcloud auth login
#   printf '%s' "$GEMINI_API_KEY" | gcloud secrets create gemini-api-key --data-file=- --project "$PROJECT_ID"
#
# Optional env vars:
#   SERVICE                   Cloud Run service name               (default: inscene)
#   REPOSITORY                Artifact Registry Docker repository  (default: inscene)
#   GEMINI_SECRET             Secret Manager secret name           (default: gemini-api-key)
#   GOOGLE_GENAI_USE_VERTEXAI "true" to use Vertex AI for analysis calls
#   GOOGLE_CLOUD_LOCATION     Vertex AI location                   (default: REGION)
#   INSCENE_ANALYSIS_MODEL    override the Gemini analysis model
#   INSCENE_TTS_MODEL         override the Gemini TTS model
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${REGION:-us-central1}"
SERVICE="${SERVICE:-inscene}"
REPOSITORY="${REPOSITORY:-inscene}"
GEMINI_SECRET="${GEMINI_SECRET:-gemini-api-key}"
TAG="${TAG:-$(date +%Y%m%d-%H%M%S)}"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "PROJECT_ID is not set and no default gcloud project is configured." >&2
  exit 1
fi

IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${SERVICE}:${TAG}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Enabling required APIs in ${PROJECT_ID}"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
  secretmanager.googleapis.com --project "${PROJECT_ID}"

if ! gcloud artifacts repositories describe "${REPOSITORY}" --location "${REGION}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
  echo "==> Creating Artifact Registry repository ${REPOSITORY}"
  gcloud artifacts repositories create "${REPOSITORY}" --repository-format=docker \
    --location "${REGION}" --project "${PROJECT_ID}" --description "InScene images"
fi

if ! gcloud secrets describe "${GEMINI_SECRET}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
  echo "Secret ${GEMINI_SECRET} not found. Create it first:" >&2
  echo "  printf '%s' \"\$GEMINI_API_KEY\" | gcloud secrets create ${GEMINI_SECRET} --data-file=- --project ${PROJECT_ID}" >&2
  exit 1
fi

# The Cloud Run runtime service account must be able to read the secret.
PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
RUNTIME_SA="${RUNTIME_SA:-${PROJECT_NUMBER}-compute@developer.gserviceaccount.com}"
gcloud secrets add-iam-policy-binding "${GEMINI_SECRET}" --project "${PROJECT_ID}" \
  --member "serviceAccount:${RUNTIME_SA}" --role roles/secretmanager.secretAccessor >/dev/null

echo "==> Building ${IMAGE} with Cloud Build"
gcloud builds submit "${ROOT_DIR}" --tag "${IMAGE}" --project "${PROJECT_ID}" --timeout=1800s

ENV_VARS="DATA_DIR=/app/data"
if [[ "${GOOGLE_GENAI_USE_VERTEXAI:-}" == "true" ]]; then
  ENV_VARS+=",GOOGLE_GENAI_USE_VERTEXAI=true,GOOGLE_CLOUD_PROJECT=${PROJECT_ID},GOOGLE_CLOUD_LOCATION=${GOOGLE_CLOUD_LOCATION:-${REGION}}"
fi
if [[ -n "${INSCENE_ANALYSIS_MODEL:-}" ]]; then
  ENV_VARS+=",INSCENE_ANALYSIS_MODEL=${INSCENE_ANALYSIS_MODEL}"
fi
if [[ -n "${INSCENE_TTS_MODEL:-}" ]]; then
  ENV_VARS+=",INSCENE_TTS_MODEL=${INSCENE_TTS_MODEL}"
fi

# Single instance: the generation queue is in memory and the store is local JSON.
# No CPU throttling: Gemini renders keep running after the HTTP response returns.
echo "==> Deploying ${SERVICE} to Cloud Run (${REGION})"
gcloud run deploy "${SERVICE}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --image "${IMAGE}" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 2Gi \
  --cpu 2 \
  --timeout 900 \
  --no-cpu-throttling \
  --min-instances 1 \
  --max-instances 1 \
  --set-env-vars "${ENV_VARS}" \
  --set-secrets "GEMINI_API_KEY=${GEMINI_SECRET}:latest"

URL="$(gcloud run services describe "${SERVICE}" --project "${PROJECT_ID}" --region "${REGION}" --format='value(status.url)')"
echo "==> InScene is live at ${URL}"
