'use client';

import { FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { QrCodeCard } from '@/components/shared/qr-code-card';
import { ReferenceImageField } from '@/components/shared/reference-image-field';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { Asset, AssetStatus, AssetTypeInfo, Location, AppUser } from '@/lib/types';
import { Check, Database, MapPin, Pencil, Tags, Trash2, UserPlus, Users, X } from 'lucide-react';

type Section = 'add-asset' | 'asset-types' | 'locations' | 'users';

const sectionCards: Array<{ id: Section; title: string; description: string; icon: React.ElementType }> = [
  { id: 'add-asset', title: 'Add Asset', description: 'Register equipment in the live database', icon: Tags },
  { id: 'asset-types', title: 'Manage Asset Types', description: 'Create categories and prefixes', icon: Database },
  { id: 'locations', title: 'Manage Locations', description: 'Configure rooms and storage areas', icon: MapPin },
  { id: 'users', title: 'Manage Users', description: 'Add staff names for event handling', icon: Users },
];

const statuses: Array<{ value: AssetStatus; label: string }> = [
  { value: 'available', label: 'Available' },
  { value: 'in-use', label: 'In Use' },
  { value: 'missing', label: 'Missing' },
  { value: 'in-repair', label: 'In Repair' },
  { value: 'retired', label: 'Retired' },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<Section>('add-asset');
  const [assetTypes, setAssetTypes] = useState<AssetTypeInfo[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [consumable, setConsumable] = useState(false);
  const [createdAsset, setCreatedAsset] = useState<Asset | null>(null);
  const [imageFieldKey, setImageFieldKey] = useState(0);
  const [editingAssetTypeId, setEditingAssetTypeId] = useState<string | null>(null);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  async function loadSettingsData() {
    const [typesResponse, locationsResponse, usersResponse] = await Promise.all([
      fetch('/api/asset-types', { cache: 'no-store' }),
      fetch('/api/locations', { cache: 'no-store' }),
      fetch('/api/users', { cache: 'no-store' }),
    ]);
    if (!typesResponse.ok || !locationsResponse.ok || !usersResponse.ok) {
      throw new Error('Unable to load settings data');
    }
    const [typesData, locationsData, usersData] = await Promise.all([
      typesResponse.json(),
      locationsResponse.json(),
      usersResponse.json(),
    ]);
    setAssetTypes(typesData.assetTypes);
    setLocations(locationsData.locations);
    setUsers(usersData.users);
  }

  useEffect(() => {
    loadSettingsData()
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to load settings data'))
      .finally(() => setLoading(false));
  }, []);

  async function submitJson(url: string, body: unknown, successMessage: string) {
    setSaving(true);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Request failed');
      toast.success(successMessage);
      await loadSettingsData();
      return data;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Request failed');
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function submitMutation(
    url: string,
    method: 'PATCH' | 'DELETE',
    body: unknown | undefined,
    successMessage: string
  ) {
    setSaving(true);
    try {
      const response = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Request failed');
      await loadSettingsData();
      toast.success(successMessage);
      return data;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Request failed');
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function handleAddAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const homeLocationId = String(form.get('homeLocationId') || '');
    const currentLocationId = String(form.get('currentLocationId') || homeLocationId);
    const payload = {
      assetId: String(form.get('assetId') || ''),
      name: String(form.get('name') || ''),
      assetTypeId: String(form.get('assetTypeId') || ''),
      serialNumber: String(form.get('serialNumber') || ''),
      purchaseDate: String(form.get('purchaseDate') || ''),
      cost: String(form.get('cost') || ''),
      consumable,
      homeLocationId,
      currentLocationId,
      status: String(form.get('status') || 'available'),
      notes: String(form.get('notes') || ''),
      referenceImageUrl: String(form.get('referenceImageUrl') || ''),
      handledBy: String(form.get('handledBy') || ''),
    };

    const result = await submitJson('/api/assets', payload, 'Asset added');
    if (result) {
      setCreatedAsset(result.asset);
      formElement.reset();
      setConsumable(false);
      setImageFieldKey((value) => value + 1);
    }
  }

  async function handleAddAssetType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const result = await submitJson('/api/asset-types', {
      name: String(form.get('name') || ''),
      prefix: String(form.get('prefix') || ''),
      description: String(form.get('description') || ''),
    }, 'Asset type added');
    if (result) formElement.reset();
  }

  async function handleAddLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const result = await submitJson('/api/locations', {
      name: String(form.get('name') || ''),
      kind: String(form.get('kind') || 'room'),
      description: String(form.get('description') || ''),
    }, 'Location added');
    if (result) formElement.reset();
  }

  async function handleAddUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const result = await submitJson('/api/users', {
      name: String(form.get('name') || ''),
      email: String(form.get('email') || '') || undefined,
    }, 'User added');
    if (result) formElement.reset();
  }

  async function handleUpdateAssetType(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await submitMutation(`/api/asset-types/${encodeURIComponent(id)}`, 'PATCH', {
      name: String(form.get('name') || ''),
      prefix: String(form.get('prefix') || ''),
      description: String(form.get('description') || ''),
    }, 'Asset type updated');
    if (result) setEditingAssetTypeId(null);
  }

  async function handleDeleteAssetType(id: string) {
    const result = await submitMutation(`/api/asset-types/${encodeURIComponent(id)}`, 'DELETE', undefined, 'Asset type deleted');
    if (result) setEditingAssetTypeId(null);
  }

  async function handleUpdateLocation(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await submitMutation(`/api/locations/${encodeURIComponent(id)}`, 'PATCH', {
      name: String(form.get('name') || ''),
      kind: String(form.get('kind') || 'room'),
      description: String(form.get('description') || ''),
    }, 'Location updated');
    if (result) setEditingLocationId(null);
  }

  async function handleDeleteLocation(id: string) {
    const result = await submitMutation(`/api/locations/${encodeURIComponent(id)}`, 'DELETE', undefined, 'Location deleted');
    if (result) setEditingLocationId(null);
  }

  async function handleUpdateUser(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await submitMutation(`/api/users/${encodeURIComponent(id)}`, 'PATCH', {
      name: String(form.get('name') || ''),
      email: String(form.get('email') || '') || undefined,
    }, 'User updated');
    if (result) setEditingUserId(null);
  }

  async function handleDeleteUser(id: string) {
    const result = await submitMutation(`/api/users/${encodeURIComponent(id)}`, 'DELETE', undefined, 'User deleted');
    if (result) setEditingUserId(null);
  }

  return (
    <div className="space-y-6 p-4 sm:p-5 lg:p-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-balance sm:text-3xl">Settings</h1>
        <p className="text-muted-foreground mt-2">Admin configuration and operational setup</p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(240px,300px)_minmax(0,1fr)] xl:gap-6">
        <div className="grid content-start gap-3 sm:grid-cols-2 xl:grid-cols-1">
          {sectionCards.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`text-left rounded-lg border p-4 transition-colors hover:bg-accent/50 ${activeSection === item.id ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-card'}`}
              >
                <div className="flex gap-3">
                  <Icon className="h-5 w-5 mt-1 shrink-0" />
                  <div>
                    <h2 className="font-semibold">{item.title}</h2>
                    <p className={`text-sm ${activeSection === item.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{item.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="space-y-6">
          {activeSection === 'add-asset' && (
            <div className="space-y-6">
              {createdAsset && (
                <QrCodeCard asset={createdAsset} />
              )}
              <Card>
                <CardHeader>
                  <CardTitle>Add Asset</CardTitle>
                  <CardDescription>Leave Asset ID blank to auto-generate from the asset type prefix, such as CAM-001.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddAsset} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Asset Name</Label>
                    <Input id="name" name="name" required placeholder="Sony FX30 Camera" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assetId">Asset ID</Label>
                    <Input id="assetId" name="assetId" placeholder="Auto-generate if blank" />
                  </div>
                  <div className="space-y-2">
                    <Label>Asset Type</Label>
                    <Select name="assetTypeId" required>
                      <SelectTrigger><SelectValue placeholder={loading ? 'Loading...' : 'Select type'} /></SelectTrigger>
                      <SelectContent>
                        {assetTypes.map((type) => <SelectItem key={type.id} value={type.id}>{type.name} ({type.prefix})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select name="status" defaultValue="available">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {statuses.map((status) => <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Home Location</Label>
                    <Select name="homeLocationId" required>
                      <SelectTrigger><SelectValue placeholder="Select home location" /></SelectTrigger>
                      <SelectContent>
                        {locations.map((location) => <SelectItem key={location.id} value={location.id}>{location.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Current Location</Label>
                    <Select name="currentLocationId" required>
                      <SelectTrigger><SelectValue placeholder="Select current location" /></SelectTrigger>
                      <SelectContent>
                        {locations.map((location) => <SelectItem key={location.id} value={location.id}>{location.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="serialNumber">Serial Number</Label>
                    <Input id="serialNumber" name="serialNumber" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="purchaseDate">Purchase Date</Label>
                    <Input id="purchaseDate" name="purchaseDate" type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cost">Cost</Label>
                    <Input id="cost" name="cost" type="number" step="0.01" min="0" />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <Label htmlFor="consumable">Consumable</Label>
                      <p className="text-sm text-muted-foreground">Use for SD cards, batteries, cables, and supplies.</p>
                    </div>
                    <Switch id="consumable" checked={consumable} onCheckedChange={setConsumable} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <ReferenceImageField key={imageFieldKey} name="referenceImageUrl" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea id="notes" name="notes" placeholder="Optional operational notes" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="handledBy">Handled By</Label>
                    <Input id="handledBy" name="handledBy" list="users" placeholder="Optional staff name" />
                    <datalist id="users">
                      {users.map((user) => <option key={user.id} value={user.name} />)}
                    </datalist>
                  </div>
                    <Button disabled={saving} className="md:col-span-2" type="submit">{saving ? 'Saving...' : 'Add Asset & Generate QR'}</Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === 'asset-types' && (
            <Card>
              <CardHeader>
                <CardTitle>Manage Asset Types</CardTitle>
                <CardDescription>Type prefixes power safe asset ID suggestions.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleAddAssetType} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px]">
                  <Input name="name" required placeholder="Asset type name" />
                  <Input name="prefix" required placeholder="Prefix" />
                  <Textarea name="description" placeholder="Optional description" className="sm:col-span-2" />
                  <Button disabled={saving} type="submit" className="sm:col-span-2">Add Asset Type</Button>
                </form>
                <div className="grid max-h-80 gap-2 overflow-y-auto pr-2">
                  {assetTypes.map((type) => (
                    editingAssetTypeId === type.id ? (
                      <form key={type.id} onSubmit={(event) => handleUpdateAssetType(event, type.id)} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_120px_auto]">
                        <Input name="name" required defaultValue={type.name} placeholder="Asset type name" />
                        <Input name="prefix" required defaultValue={type.prefix} placeholder="Prefix" />
                        <div className="flex gap-2">
                          <Button type="submit" size="icon" disabled={saving}>
                            <Check className="h-4 w-4" />
                            <span className="sr-only">Save asset type</span>
                          </Button>
                          <Button type="button" size="icon" variant="outline" onClick={() => setEditingAssetTypeId(null)}>
                            <X className="h-4 w-4" />
                            <span className="sr-only">Cancel edit</span>
                          </Button>
                        </div>
                        <Textarea name="description" defaultValue={type.description ?? ''} placeholder="Optional description" className="sm:col-span-3" />
                      </form>
                    ) : (
                      <div key={type.id} className="group relative flex items-center justify-between gap-3 overflow-hidden rounded-lg border p-3 transition-colors hover:bg-accent/40">
                        <span className="min-w-0 truncate">{type.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="w-10 text-center text-sm text-muted-foreground transition-transform duration-500 ease-out group-hover:-translate-x-20 group-focus-within:-translate-x-20">{type.prefix}</span>
                          <div className="absolute right-2 grid w-28 translate-x-2 grid-cols-3 items-center justify-items-center opacity-0 transition-all duration-500 ease-out group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:translate-x-0 group-focus-within:opacity-100">
                            <span aria-hidden="true" />
                            <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingAssetTypeId(type.id)}>
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit {type.name}</span>
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Delete {type.name}</span>
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete asset type?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Delete "{type.name}" only if no assets use it. If assets already use this type, rename it instead.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteAssetType(type.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === 'locations' && (
            <Card>
              <CardHeader>
                <CardTitle>Manage Locations</CardTitle>
                <CardDescription>Storage is represented by location, not asset status.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleAddLocation} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_180px]">
                  <Input name="name" required placeholder="Location name" />
                  <Select name="kind" defaultValue="room">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="room">Room</SelectItem>
                      <SelectItem value="storage">Storage</SelectItem>
                    </SelectContent>
                  </Select>
                  <Textarea name="description" placeholder="Optional description" className="sm:col-span-2" />
                  <Button disabled={saving} type="submit" className="sm:col-span-2">Add Location</Button>
                </form>
                <div className="grid max-h-80 gap-2 overflow-y-auto pr-2">
                  {locations.map((location) => (
                    editingLocationId === location.id ? (
                      <form key={location.id} onSubmit={(event) => handleUpdateLocation(event, location.id)} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_160px_auto]">
                        <Input name="name" required defaultValue={location.name} placeholder="Location name" />
                        <Select name="kind" defaultValue={location.kind}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="room">Room</SelectItem>
                            <SelectItem value="storage">Storage</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                          <Button type="submit" size="icon" disabled={saving}>
                            <Check className="h-4 w-4" />
                            <span className="sr-only">Save location</span>
                          </Button>
                          <Button type="button" size="icon" variant="outline" onClick={() => setEditingLocationId(null)}>
                            <X className="h-4 w-4" />
                            <span className="sr-only">Cancel edit</span>
                          </Button>
                        </div>
                        <Textarea name="description" defaultValue={location.description ?? ''} placeholder="Optional description" className="sm:col-span-3" />
                      </form>
                    ) : (
                      <div key={location.id} className="group relative flex items-center justify-between gap-3 overflow-hidden rounded-lg border p-3 transition-colors hover:bg-accent/40">
                        <span className="min-w-0 truncate">{location.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="w-16 text-center text-sm text-muted-foreground capitalize transition-transform duration-500 ease-out group-hover:-translate-x-24 group-focus-within:-translate-x-24">{location.kind}</span>
                          <div className="absolute right-2 grid w-28 translate-x-2 grid-cols-3 items-center justify-items-center opacity-0 transition-all duration-500 ease-out group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:translate-x-0 group-focus-within:opacity-100">
                            <span aria-hidden="true" />
                            <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingLocationId(location.id)}>
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit {location.name}</span>
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Delete {location.name}</span>
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete location?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Delete "{location.name}" only if it has no assets, events, or audits connected to it. If it is already in use, rename it instead.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteLocation(location.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === 'users' && (
            <Card>
              <CardHeader>
                <CardTitle>Manage Users</CardTitle>
                <CardDescription>Lightweight user records for handled-by audit trail fields.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input name="name" required placeholder="Staff name" />
                  <Input name="email" type="email" placeholder="Optional email" />
                  <Button disabled={saving} type="submit" className="md:col-span-2">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </form>
                <div className="grid max-h-80 gap-2 overflow-y-auto pr-2">
                  {users.length > 0 ? users.map((user) => (
                    editingUserId === user.id ? (
                      <form key={user.id} onSubmit={(event) => handleUpdateUser(event, user.id)} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_auto]">
                        <Input name="name" required defaultValue={user.name} placeholder="Staff name" />
                        <Input name="email" type="email" defaultValue={user.email ?? ''} placeholder="Optional email" />
                        <div className="flex gap-2">
                          <Button type="submit" size="icon" disabled={saving}>
                            <Check className="h-4 w-4" />
                            <span className="sr-only">Save user</span>
                          </Button>
                          <Button type="button" size="icon" variant="outline" onClick={() => setEditingUserId(null)}>
                            <X className="h-4 w-4" />
                            <span className="sr-only">Cancel edit</span>
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <div key={user.id} className="group relative flex items-center justify-between gap-3 overflow-hidden rounded-lg border p-3 transition-colors hover:bg-accent/40">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{user.name}</p>
                          {user.email && <p className="text-sm text-muted-foreground truncate">{user.email}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-12 text-center text-xs text-muted-foreground transition-transform duration-500 ease-out group-hover:-translate-x-20 group-focus-within:-translate-x-20">Active</span>
                          <div className="absolute right-2 grid w-28 translate-x-2 grid-cols-3 items-center justify-items-center opacity-0 transition-all duration-500 ease-out group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:translate-x-0 group-focus-within:opacity-100">
                            <span aria-hidden="true" />
                            <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingUserId(user.id)}>
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit {user.name}</span>
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Delete {user.name}</span>
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete user?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Remove "{user.name}" from active handler lists. Existing event log text remains unchanged.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    )
                  )) : <p className="text-sm text-muted-foreground">No users added yet. Actions can still store manually entered names.</p>}
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
