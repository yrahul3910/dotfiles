resource "google_compute_instance" "vm_instance" {
  name         = "tiny"
  machine_type = "e2-medium"  # 2 vCPUs, 4 GB RAM
  zone         = "us-central1-a"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
      size  = 40
    }
  }

  # Network interface with ephemeral external IP
  network_interface {
    network = "default"
    access_config {}
  }

  # Tags to identify the instance, if needed for firewall rules, etc.
  tags = ["tiny"]
}

