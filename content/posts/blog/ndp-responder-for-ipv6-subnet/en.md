---
title: "Using NDP Responder to Get IPv6 Subnet Devices Online on a Dedicated Server"
publishedAt: 2026-09-26T08:00:00Z
type: home
category: "tech"
layout: text # text | illustrated | gallery
tags: ["IPv6","NDP Proxy","networking","Linux","Go"]
draft: true
# 图片 type 至少需要 cover 或正文图片
# cover: ./cover.png
# coverAlt: "图片替代文字"
---


### Preface

When running independent servers (such as Hetzner, OVH), we often run into a pain point: the data center only gives you a `/64` or `/56` IPv6 block, but the gateway strictly binds to a physical MAC address. If you want to spin up sub-machines (LXC/KVM) inside the host machine, the IPv6 packets sent from the sub-machines' virtual MAC will be dropped directly by the gateway.

Today, through **NDP Responder (NDP Proxy)** technology, we'll manually implement an industrial-grade solution that lets subnet devices "disguise" themselves for internet access.

---

### I. Core Principle: Why Do We Need an NDP Proxy?

In IPv4, we're used to using NAT. But in the world of IPv6, we advocate for end-to-end communication.
Normally, when an external gateway looks for a certain IPv6 address, it sends a **Neighbor Solicitation**.

* **Problem:** The virtual machines inside the host machine aren't directly connected to the data center switch, so they can't receive this request; even if they did receive it, their reply (containing the virtual MAC) would be intercepted by the data center switch's firewall.
* **Solution:** We run a proxy program on the host machine. It listens on the physical network card, and when it discovers someone asking about a virtual machine's IP, it preemptively answers: "This IP is with me, please send the packet to my physical MAC." After the host machine receives the packet, it forwards it to the virtual machine according to the internal routing table.

---

### II. Environment Preparation

* **Host Machine:** Debian/Ubuntu (this example uses a Proxmox environment)
* **Tool:** `ndpresponder` (a lightweight tool written in Go, which fits your learning direction perfectly)
* **Network Topology:**
* Physical network card: `ens3` (connected to the external network)
* Virtual bridge: `vmbr1` (connected to internal containers)



---

### III. Detailed Steps

#### 1. Enable Kernel Forwarding

First, the Linux kernel must be allowed to let IPv6 packets "travel" between different network cards.
Modify `/etc/sysctl.conf`:

```bash
# Enable IPv6 forwarding on all interfaces
net.ipv6.conf.all.forwarding=1
# Allow receiving router advertisements
net.ipv6.conf.ens3.accept_ra=2
# Enable NDP proxy support
net.ipv6.conf.all.proxy_ndp=1

```

Run `sysctl -p` to apply.

#### 2. Configure Network Interfaces (`/etc/network/interfaces`)

We need to define two "pools," one external and one internal.

```text
# External main bridge
auto vmbr0
iface vmbr0 inet6 static
    address 2a01:4f8:xxx:113a/80  # Your main IP
    gateway fe80::1               # Data center gateway

# Internal subnet bridge (for virtual machines)
auto vmbr1
iface vmbr1 inet6 static
    address 2a01:4f8:xxx:10e0::1/96
    bridge-ports none
    bridge-stp off

```

#### 3. Deploy NDP Responder

We'll run the program in a Systemd daemon.
Create the file `/etc/systemd/system/ndpresponder.service`:

```ini
[Unit]
Description=NDP Responder for LXC Subnet
After=network.target

[Service]
# -i: the external interface to listen on
# -n: the internal subnet to proxy
ExecStart=/usr/sbin/ndpresponder -i vmbr0 -n 2a01:4f8:xxx:10e0::/96
Restart=always

[Install]
WantedBy=multi-user.target

```

Start the service: `systemctl enable --now ndpresponder`.

---

### IV. Verification and Debugging

As developers, we must learn to read logs. Observe `journalctl -u ndpresponder -f`:

> **Found Gateway:** Found the data center gateway...
> **RESPOND:** who-has `...:10e0:1010:3` tell `fe80::...`

When you see the word `RESPOND`, it means the host machine has successfully "impersonated" the virtual machine and completed the neighbor discovery handshake.

---

### V. Architectural Reflection (Student Perspective)

From the perspective of **Go language development**, what inspiration does this technology bring us?

1. **Decoupling:** NDP Proxy essentially acts as a transparent adapter between the link layer (L2) and the network layer (L3).
2. **Concurrency Model:** Tools like `ndpresponder` typically use Go's `pcap` library or raw sockets to listen to traffic. This requires extremely high processing efficiency and is an excellent case for learning how Go handles high-performance network streams.
3. **Industrial Standards:** This configuration pattern (Map First, Code Follows) conforms to the IEP collaboration protocol we discussed earlier—first plan the network topology (Map), then proceed with service deployment (Code).

---

### Conclusion

IPv6 is no longer a mysterious black box. By understanding the NDP protocol and manually configuring the proxy, we have not only solved the data center internet access problem, but also gained a deeper understanding of the routing essence of the modern internet.
