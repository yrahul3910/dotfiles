provider "google" {
  project = "modified-legacy-186817"
  region  = "us-central1"
  zone    = "us-central1-a"
}

data "google_project" "project" {}

