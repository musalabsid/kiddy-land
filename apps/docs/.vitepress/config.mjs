import { defineConfig } from "vitepress";
export default defineConfig({
  base: "/kiddy-land/",
  locales: {
    root: {
      label: "English",
      lang: "en",
      title: "Kiddy Land",
      description: "User Guide - Local venue operation",
      themeConfig: {
        nav: [
          {
            text: "Download v0.1.2",
            link: "https://github.com/musalabsid/kiddy-land/releases",
          },
        ],
        sidebar: [
          {
            text: "Guide",
            items: [
              { text: "Welcome", link: "/guide/" },
              { text: "Quick Start", link: "/guide/quick-start" },
              { text: "Install", link: "/guide/install" },
            ],
          },
          {
            text: "Network Setup",
            items: [
              { text: "Why IP matters", link: "/network/why-ip" },
              { text: "Windows Static IP", link: "/network/windows-static-ip" },
              { text: "Linux Static IP", link: "/network/linux-static-ip" },
              {
                text: "Router Reservation",
                link: "/network/router-reservation",
              },
            ],
          },
          {
            text: "Using the App",
            items: [
              { text: "Pairing Devices", link: "/guide/pairing" },
              { text: "Roles & Permissions", link: "/guide/roles" },
              { text: "Selling Tickets", link: "/guide/selling" },
              { text: "Scanning Entry/Exit", link: "/guide/scanning" },
              { text: "Members & Cards", link: "/guide/members" },
            ],
          },
          {
            text: "Owner Tools",
            items: [
              { text: "Calendar & Hours", link: "/guide/calendar" },
              { text: "Reports", link: "/guide/reports" },
              { text: "Customization", link: "/guide/customization" },
            ],
          },
          {
            text: "Maintenance",
            items: [
              { text: "Backups & Restore", link: "/guide/backups" },
              { text: "Updates", link: "/guide/updates" },
              { text: "Troubleshooting", link: "/guide/troubleshooting" },
            ],
          },
        ],
      },
    },
    id: {
      label: "Indonesia",
      lang: "id",
      title: "Kiddy Land",
      description: "Panduan Pengguna - Operasi venue lokal",
      themeConfig: {
        nav: [
          {
            text: "Unduh v0.1.2",
            link: "https://github.com/musalabsid/kiddy-land/releases",
          },
        ],
        sidebar: [
          {
            text: "Panduan",
            items: [
              { text: "Selamat Datang", link: "/id/guide/" },
              { text: "Mulai Cepat", link: "/id/guide/quick-start" },
              { text: "Instalasi", link: "/id/guide/install" },
            ],
          },
          {
            text: "Setup Jaringan",
            items: [
              { text: "Kenapa IP Penting", link: "/id/network/why-ip" },
              {
                text: "IP Statis Windows",
                link: "/id/network/windows-static-ip",
              },
              { text: "IP Statis Linux", link: "/id/network/linux-static-ip" },
              {
                text: "Reservasi Router",
                link: "/id/network/router-reservation",
              },
            ],
          },
          {
            text: "Menggunakan Aplikasi",
            items: [
              { text: "Pairing Perangkat", link: "/id/guide/pairing" },
              { text: "Peran & Hak Akses", link: "/id/guide/roles" },
              { text: "Menjual Tiket", link: "/id/guide/selling" },
              { text: "Scan Masuk/Keluar", link: "/id/guide/scanning" },
              { text: "Member & Kartu", link: "/id/guide/members" },
            ],
          },
          {
            text: "Alat Pemilik",
            items: [
              { text: "Kalender & Jam", link: "/id/guide/calendar" },
              { text: "Laporan", link: "/id/guide/reports" },
              { text: "Kustomisasi", link: "/id/guide/customization" },
            ],
          },
          {
            text: "Perawatan",
            items: [
              { text: "Backup & Restore", link: "/id/guide/backups" },
              { text: "Update", link: "/id/guide/updates" },
              { text: "Troubleshooting", link: "/id/guide/troubleshooting" },
            ],
          },
        ],
      },
    },
  },
  themeConfig: {
    socialLinks: [
      { icon: "github", link: "https://github.com/musalabsid/kiddy-land" },
    ],
  },
});
