resource "google_compute_instance" "gpu" {
  name         = "gpu"
  machine_type = "n1-standard-4"
  zone         = "europe-west4-c"

  boot_disk {
    auto_delete = true
    device_name = "gpu"

    initialize_params {
      image = "projects/ubuntu-os-cloud/global/images/ubuntu-2404-noble-amd64-v20241115"
      size  = 100
      type  = "pd-standard"
    }

    mode = "READ_WRITE"
  }

  can_ip_forward      = false
  deletion_protection = false
  enable_display      = false

  guest_accelerator {
    count = 1
    type  = "nvidia-tesla-p4"
  }

  network_interface {
    network = "default"

    access_config {
      network_tier = "PREMIUM"
    }
  }

  scheduling {
    automatic_restart   = true
    on_host_maintenance = "TERMINATE"
    preemptible         = false
    provisioning_model  = "STANDARD"
  }

  metadata_startup_script = <<-EOF
    #!/bin/bash
    if test -f /opt/google/cuda-installer
    then
      sudo python3 /opt/google/cuda-installer/cuda_installer.pyz install_cuda
      exit
    fi

    mkdir -p /opt/google/cuda-installer/
    cd /opt/google/cuda-installer/ || exit

    curl -fSsL -O https://github.com/GoogleCloudPlatform/compute-gpu-installation/releases/download/cuda-installer-v1.1.0/cuda_installer.pyz
    sudo python3 cuda_installer.pyz install_cuda
  EOF

  shielded_instance_config {
    enable_integrity_monitoring = true
    enable_secure_boot          = false
    enable_vtpm                 = true
  }
}

