provider "google" {
  project = "modified-legacy-186817"
  region  = "us-central1"
  zone    = "us-central1-a"
  credentials = file("~/gcloud-compute-servicekey.json")
}
