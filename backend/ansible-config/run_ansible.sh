#!/bin/bash

# Lokasi file konfigurasi
CONFIG_DIR="/home/cisco/ansible-config"
ANSIBLE_CFG="$CONFIG_DIR/ansible.cfg"
INVENTORY="$CONFIG_DIR/inventory"
SCENARIO="$CONFIG_DIR/scenario.yml"

# Pastikan environment variables tersedia
export ANSIBLE_CONFIG="$ANSIBLE_CFG"

# Fungsi untuk menjalankan playbook
run_playbook() {
    local scenario=$1
    local extra_vars=$2

    if [ -f "$scenario" ]; then
        echo "Running playbook: $scenario"
        if [ -n "$extra_vars" ]; then
            ansible-playbook "$scenario" -i "$INVENTORY" --extra-vars "$extra_vars"
        else
            ansible-playbook "$scenario" -i "$INVENTORY"
        fi
    else
        echo "Error: Playbook not found at $scenario"
        exit 1
    fi
}

# Terima parameter dari webhook
SCENARIO_NAME=$1
EXTRA_VARS=$2

if [ -z "$SCENARIO_NAME" ]; then
    echo "Error: No scenario name provided"
    exit 1
fi

# Jalankan playbook yang sesuai
SCENARIO_PATH="$CONFIG_DIR/$SCENARIO_NAME.yml"
run_playbook "$SCENARIO_PATH" "$EXTRA_VARS" 