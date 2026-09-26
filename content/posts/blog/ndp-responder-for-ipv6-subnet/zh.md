---
title: "在独立服务器上用 NDP Responder 让 IPv6 子网设备上网"
publishedAt: 2026-09-26T08:00:00Z
type: home
category: "tech"
layout: text # text | illustrated | gallery
tags: ["IPv6","NDP Proxy","网络","Linux","Go"]
draft: true
# 图片 type 至少需要 cover 或正文图片
# cover: ./cover.png
# coverAlt: "图片替代文字"
---

### 前言

在玩独立服务器（如 Hetzner, OVH）时，我们经常遇到一个痛点：机房只给了你一个 `/64` 或 `/56` 的 IPv6 段，但网关严格绑定了物理 MAC 地址。如果你想在宿主机里开子鸡（LXC/KVM），子鸡的虚拟 MAC 发出的 IPv6 包会被网关直接丢弃。

今天我们通过 **NDP Responder (NDP Proxy)** 技术，手号实现一套让子网设备“伪装”上网的工业级方案。

---

### 一、 核心原理：为什么需要 NDP 代理？

在 IPv4 中，我们习惯用 NAT。但在 IPv6 的世界里，我们推崇端到端通信。
通常情况下，当外部网关寻找某个 IPv6 地址时，会发送一个 **邻居请求 (Neighbor Solicitation)**。

* **问题：** 宿主机里的虚拟机没有直接连在机房交换机上，收不到这个请求；即便收到了，它的回复（包含虚拟 MAC）也会被机房交换机防火墙拦截。
* **方案：** 我们在宿主机运行一个代理程序。它监听物理网卡，当发现有人询问虚拟机 IP 时，它抢先回答：“这个 IP 在我这，请把包发给我的物理 MAC”。宿主机收到包后，再根据内部路由表转发给虚拟机。

---

### 二、 环境准备

* **宿主机：** Debian/Ubuntu (本例使用 Proxmox 环境)
* **工具：** `ndpresponder` (Go 编写的轻量级工具，正好契合你的学习方向)
* **网络拓扑：**
* 物理网卡：`ens3` (连外网)
* 虚拟网桥：`vmbr1` (连内网容器)



---

### 三、 详细步骤

#### 1. 开启内核转发

首先，必须让 Linux 内核允许 IPv6 数据包在不同网卡间“穿梭”。
修改 `/etc/sysctl.conf`：

```bash
# 开启所有接口的 IPv6 转发
net.ipv6.conf.all.forwarding=1
# 允许接收路由公告
net.ipv6.conf.ens3.accept_ra=2
# 开启 NDP 代理支持
net.ipv6.conf.all.proxy_ndp=1

```

执行 `sysctl -p` 生效。

#### 2. 配置网络接口 (`/etc/network/interfaces`)

我们要定义两个“池子”，一个对外，一个对内。

```text
# 对外主网桥
auto vmbr0
iface vmbr0 inet6 static
    address 2a01:4f8:xxx:113a/80  # 你的主 IP
    gateway fe80::1               # 机房网关

# 对内子网桥 (给虚拟机用)
auto vmbr1
iface vmbr1 inet6 static
    address 2a01:4f8:xxx:10e0::1/96
    bridge-ports none
    bridge-stp off

```

#### 3. 部署 NDP Responder

我们将程序跑在 Systemd 守护进程中。
创建文件 `/etc/systemd/system/ndpresponder.service`：

```ini
[Unit]
Description=NDP Responder for LXC Subnet
After=network.target

[Service]
# -i: 监听的外网接口
# -n: 需要代理的内网子网段
ExecStart=/usr/sbin/ndpresponder -i vmbr0 -n 2a01:4f8:xxx:10e0::/96
Restart=always

[Install]
WantedBy=multi-user.target

```

启动服务：`systemctl enable --now ndpresponder`。

---

### 四、 验证与调试

身为开发者，我们要学会看日志。观察 `journalctl -u ndpresponder -f`：

> **Found Gateway:** 发现机房网关...
> **RESPOND:** who-has `...:10e0:1010:3` tell `fe80::...`

当你看到 `RESPOND` 字样时，说明宿主机已经成功“冒充”了虚拟机，完成了邻居发现的握手。

---

### 五、 架构思考 (Student Perspective)

从 **Go 语言开发** 的角度看，这个技术带给我们什么启发？

1. **解耦：** NDP Proxy 实际上是在链路层（L2）和网络层（L3）之间做了一个透明适配器。
2. **并发模型：** `ndpresponder` 这类工具通常使用 Go 的 `pcap` 库或原始套接字（Raw Socket）监听流量，这需要极高的处理效率，是学习 Go 处理高性能网络流的绝佳案例。
3. **工业规范：** 这种配置模式（Map First, Code Follows）符合我们之前讨论的 IEP 协作协议，先规划好网络拓扑（Map），再进行服务部署（Code）。

---

### 结语

IPv6 不再是神秘的黑盒。通过理解 NDP 协议并手动配置代理，我们不仅解决了机房上网问题，更深刻理解了现代互联网的路由本质。
