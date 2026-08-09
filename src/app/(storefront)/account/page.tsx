"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { toast } from "@/store/toast";

interface Profile {
  name: string;
  email: string;
  phone: string | null;
}

export default function AccountProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    fetch("/api/account/profile")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setProfile(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  async function saveProfile() {
    if (!profile) return;
    setSaving(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profile.name, phone: profile.phone || undefined }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Profile updated");
      } else {
        toast.error(json.error ?? "Failed to update profile");
      }
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwords),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Password changed");
        setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        toast.error(json.error ?? "Failed to change password");
      }
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading || !profile) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">My Profile</h1>
        </CardHeader>
        <CardBody className="space-y-4">
          <Input label="Name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          <Input label="Email" value={profile.email} disabled />
          <Input label="Phone" value={profile.phone ?? ""} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          <Button onClick={saveProfile} loading={saving}>
            Save Changes
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-medium text-gray-900 dark:text-white">Change Password</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            value={passwords.currentPassword}
            onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))}
          />
          <Input
            label="New Password"
            type="password"
            value={passwords.newPassword}
            onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={passwords.confirmPassword}
            onChange={(e) => setPasswords((p) => ({ ...p, confirmPassword: e.target.value }))}
          />
          <Button onClick={changePassword} loading={changingPassword}>
            Change Password
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
