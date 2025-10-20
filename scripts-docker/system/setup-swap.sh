#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=========================================="
echo -e "${BLUE}Raspberry Pi SWAP Setup${NC}"
echo "=========================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}✗ Please run as root (use sudo)${NC}"
    exit 1
fi

# Configuration
SWAP_SIZE="2G"
SWAP_DIR="/swap"
SWAP_FILE="${SWAP_DIR}/swapfile"
SWAPPINESS=10

echo -e "\n${BLUE}Configuration:${NC}"
echo "  • SWAP size: $SWAP_SIZE"
echo "  • SWAP location: $SWAP_FILE"
echo "  • Swappiness: $SWAPPINESS (lower = uses RAM more)"

# Check if swap already exists
if swapon --show | grep -q "$SWAP_FILE"; then
    echo -e "\n${YELLOW}⚠ SWAP already configured at $SWAP_FILE${NC}"
    swapon --show
    echo -e "\nDo you want to recreate it? (y/N)"
    read -r response
    if [ "$response" != "y" ] && [ "$response" != "Y" ]; then
        echo "Cancelled"
        exit 0
    fi

    echo -e "\n${YELLOW}→${NC} Disabling existing SWAP..."
    swapoff "$SWAP_FILE"
    rm -f "$SWAP_FILE"
fi

# Create swap directory if it doesn't exist
echo -e "\n${YELLOW}→${NC} Creating SWAP directory..."
mkdir -p "$SWAP_DIR"

# Create swap file
echo -e "\n${YELLOW}→${NC} Creating ${SWAP_SIZE} SWAP file (this may take a moment)..."
if command -v fallocate &> /dev/null; then
    fallocate -l "$SWAP_SIZE" "$SWAP_FILE"
else
    dd if=/dev/zero of="$SWAP_FILE" bs=1M count=2048 status=progress
fi

# Set proper permissions
echo -e "\n${YELLOW}→${NC} Setting permissions..."
chmod 600 "$SWAP_FILE"

# Setup swap
echo -e "\n${YELLOW}→${NC} Configuring as SWAP..."
mkswap "$SWAP_FILE"

# Enable swap
echo -e "\n${YELLOW}→${NC} Enabling SWAP..."
swapon "$SWAP_FILE"

# Verify swap is active
if swapon --show | grep -q "$SWAP_FILE"; then
    echo -e "\n${GREEN}✓ SWAP enabled successfully${NC}"
else
    echo -e "\n${RED}✗ Failed to enable SWAP${NC}"
    exit 1
fi

# Make swap permanent (add to /etc/fstab if not already there)
echo -e "\n${YELLOW}→${NC} Making SWAP permanent..."
if ! grep -q "$SWAP_FILE" /etc/fstab; then
    echo "$SWAP_FILE none swap sw 0 0" | tee -a /etc/fstab > /dev/null
    echo -e "${GREEN}✓ Added to /etc/fstab${NC}"
else
    echo -e "${YELLOW}⚠ Already in /etc/fstab${NC}"
fi

# Configure swappiness
echo -e "\n${YELLOW}→${NC} Configuring swappiness to $SWAPPINESS..."
sysctl vm.swappiness=$SWAPPINESS

# Make swappiness permanent
if ! grep -q "vm.swappiness" /etc/sysctl.conf; then
    echo "vm.swappiness=$SWAPPINESS" | tee -a /etc/sysctl.conf > /dev/null
    echo -e "${GREEN}✓ Swappiness added to /etc/sysctl.conf${NC}"
else
    # Update existing value
    sed -i "s/^vm.swappiness=.*/vm.swappiness=$SWAPPINESS/" /etc/sysctl.conf
    echo -e "${GREEN}✓ Swappiness updated in /etc/sysctl.conf${NC}"
fi

# Show swap status
echo -e "\n=========================================="
echo -e "${GREEN}✓ SWAP Setup Complete${NC}"
echo "=========================================="

echo -e "\n${BLUE}SWAP Status:${NC}"
swapon --show

echo -e "\n${BLUE}Memory Status:${NC}"
free -h

echo -e "\n${BLUE}Current Swappiness:${NC}"
cat /proc/sys/vm/swappiness

echo -e "\n${BLUE}Notes:${NC}"
echo "  • SWAP is now active and will persist across reboots"
echo "  • Swappiness=$SWAPPINESS means the system will prefer RAM over SWAP"
echo "  • Lower swappiness = better performance but uses more RAM"
echo "  • Your SSD can handle SWAP operations efficiently"
echo "  • Monitor SWAP usage with: swapon --show"

echo ""
