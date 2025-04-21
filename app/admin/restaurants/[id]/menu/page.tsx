"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Trash2, AlertCircle, MoreVertical, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { RestaurantDB } from "@/lib/restaurant-db"
import { AdminRestaurant, AdminRestaurantMenuItem, RestaurantMenuItemFormData } from "@/types/restaurant"
import { AdminRestaurantMenu, AdminRestaurantMenuCategory, RestaurantMenuFormData, RestaurantMenuCategoryFormData } from "@/types/restaurant-menu"

export default function RestaurantMenuPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const restaurantDb = RestaurantDB.getInstance()

  // Unwrap params using React.use()
  const unwrappedParams = React.use(params)
  const restaurantId = unwrappedParams.id

  const [restaurant, setRestaurant] = useState<AdminRestaurant | null>(null)
  const [menus, setMenus] = useState<AdminRestaurantMenu[]>([])
  const [categories, setCategories] = useState<AdminRestaurantMenuCategory[]>([])
  const [selectedMenuId, setSelectedMenuId] = useState<string>("")
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("")
  const [menuItems, setMenuItems] = useState<AdminRestaurantMenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [menuDbError, setMenuDbError] = useState<string | null>(null)
  const [menuLoading, setMenuLoading] = useState(false)
  const [categoryLoading, setCategoryLoading] = useState(false)
  const [menuError, setMenuError] = useState<string | null>(null)
  const [categoryError, setCategoryError] = useState<string | null>(null)

  // Form states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentMenuItem, setCurrentMenuItem] = useState<AdminRestaurantMenuItem | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>("all")

  const [formData, setFormData] = useState<RestaurantMenuItemFormData>({
    name: "",
    description: "",
    restaurant_id: restaurantId,
    menu_id: "",
    category_id: "",
    price: 0,
    currency: "USD",
    is_available: true,
    is_featured: false,
  })

  useEffect(() => {
    fetchRestaurantData()
    fetchMenus()
  }, [restaurantId])

  useEffect(() => {
    if(selectedMenuId) fetchCategories(selectedMenuId)
  }, [selectedMenuId])

  useEffect(() => {
    if(selectedCategoryId) fetchMenuItems(selectedCategoryId)
  }, [selectedCategoryId])

  const fetchRestaurantData = async () => {
    try {
      const restaurantData = await restaurantDb.getRestaurantById(restaurantId)
      setRestaurant(restaurantData)
    } catch (error) {
      console.error("Error fetching restaurant:", error)
      toast({
        title: "Error",
        description: "Failed to load restaurant details",
        variant: "destructive",
      })
    }
  }

  const fetchMenus = async () => {
    setMenuLoading(true)
    setMenuError(null)
    try {
      const menus = await restaurantDb.getMenusByRestaurantId(restaurantId)
      setMenus(menus)
      if (menus.length > 0) setSelectedMenuId(menus[0].id)
    } catch (error) {
      setMenuError("Failed to load menus.")
    } finally {
      setMenuLoading(false)
    }
  }

  const fetchCategories = async (menuId: string) => {
    setCategoryLoading(true)
    setCategoryError(null)
    try {
      const cats = await restaurantDb.getCategoriesByMenuId(menuId)
      setCategories(cats)
      if (cats.length > 0) setSelectedCategoryId(cats[0].id)
    } catch (error) {
      setCategoryError("Failed to load categories.")
    } finally {
      setCategoryLoading(false)
    }
  }

  const fetchMenuItems = async (categoryId: string) => {
    setLoading(true)
    setMenuDbError(null)
    try {
      // Fetch menu items for the selected category
      const items = await restaurantDb.getRestaurantMenuItemsByCategoryId(categoryId)
      setMenuItems(items)
    } catch (error) {
      setMenuDbError("Failed to load menu items. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData({
      ...formData,
      [field]: value,
    })
    if(field === 'menu_id') {
      setSelectedMenuId(value)
      setFormData(f => ({...f, category_id: ""}))
    }
    if(field === 'category_id') {
      setSelectedCategoryId(value)
    }
  }

  const handleAddMenuItem = async () => {
    try {
      const menuItem = await restaurantDb.createRestaurantMenuItem({
        ...formData,
        restaurant_id: restaurantId,
      })

      if (menuItem) {
        toast({
          title: "Success",
          description: `Menu item "${formData.name}" has been added.`,
        })
        fetchMenuItems(selectedCategoryId)
        setIsAddDialogOpen(false)
        resetForm()
      } else {
        throw new Error("Failed to add menu item")
      }
    } catch (error) {
      console.error("Error adding menu item:", error)
      toast({
        title: "Error",
        description: "Failed to add menu item. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleEditMenuItem = async () => {
    if (!currentMenuItem) return

    try {
      const updatedMenuItem = await restaurantDb.updateRestaurantMenuItem(
        currentMenuItem.id,
        formData
      )

      if (updatedMenuItem) {
        toast({
          title: "Success",
          description: `Menu item "${formData.name}" has been updated.`,
        })
        fetchMenuItems(selectedCategoryId)
        setIsEditDialogOpen(false)
        resetForm()
      } else {
        throw new Error("Failed to update menu item")
      }
    } catch (error) {
      console.error("Error updating menu item:", error)
      toast({
        title: "Error",
        description: "Failed to update menu item. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteMenuItem = async () => {
    if (!currentMenuItem) return

    try {
      const success = await restaurantDb.deleteRestaurantMenuItem(currentMenuItem.id)

      if (success) {
        toast({
          title: "Success",
          description: `Menu item "${currentMenuItem.name}" has been deleted.`,
        })
        fetchMenuItems(selectedCategoryId)
        setIsDeleteDialogOpen(false)
      } else {
        throw new Error("Failed to delete menu item")
      }
    } catch (error) {
      console.error("Error deleting menu item:", error)
      toast({
        title: "Error",
        description: "Failed to delete menu item. Please try again.",
        variant: "destructive",
      })
    }
  }

  const openEditDialog = (item: AdminRestaurantMenuItem) => {
    setCurrentMenuItem(item)
    setFormData({
      name: item.name,
      description: item.description,
      restaurant_id: item.restaurant_id,
      menu_id: item.menu_id,
      category_id: item.category_id,
      price: item.price,
      currency: item.currency,
      is_available: item.is_available,
      is_featured: item.is_featured,
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (item: AdminRestaurantMenuItem) => {
    setCurrentMenuItem(item)
    setIsDeleteDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      restaurant_id: restaurantId,
      menu_id: "",
      category_id: "",
      price: 0,
      currency: "USD",
      is_available: true,
      is_featured: false,
    })
    setCurrentMenuItem(null)
  }

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price)
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{restaurant?.name || 'Restaurant'} Menu</h1>
          <p className="text-gray-500">Manage menu items for this restaurant</p>
        </div>
        <div className="space-x-4">
          <Button variant="outline" onClick={() => router.push(`/admin/restaurants/${restaurantId}`)}>
            Back to Restaurant
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Menu Item
          </Button>
        </div>
      </div>

      {menuDbError && (
        <Alert className="mb-6 bg-amber-50 border-amber-200 text-amber-800">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Database Error</AlertTitle>
          <AlertDescription>{menuDbError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Menu Items</CardTitle>
              <CardDescription>
                {menuItems.length} item{menuItems.length !== 1 ? 's' : ''} {activeCategory !== 'all' ? `in ${activeCategory}` : ''}
              </CardDescription>
            </div>
            <Tabs value={selectedMenuId} onValueChange={setSelectedMenuId} className="w-full max-w-md">
              <TabsList className="grid grid-cols-3 sm:grid-cols-5">
                {menus.map(menu => (
                  <TabsTrigger key={menu.id} value={menu.id} className="capitalize">
                    {menu.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-100 h-20 rounded-md"></div>
              ))}
            </div>
          ) : menuItems.length > 0 ? (
            <div className="space-y-4">
              {menuItems.map((menuItem) => (
                <div key={menuItem.id} className="flex items-center justify-between border rounded-md p-4">
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${menuItem.is_available ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <h3 className="font-medium">{menuItem.name}</h3>
                        {menuItem.is_featured && (
                          <Badge className="ml-2 bg-amber-100 text-amber-800 hover:bg-amber-100">Featured</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-1">{menuItem.description}</p>
                      <div className="flex items-center space-x-2 text-sm">
                        <Badge variant="outline" className="capitalize">{menuItem.category_id}</Badge>
                        <span className="font-medium">{formatPrice(menuItem.price, menuItem.currency)}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(menuItem)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => openDeleteDialog(menuItem)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No menu items found{activeCategory !== 'all' ? ` in ${activeCategory} category` : ''}.</p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Menu Item
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Menu Item Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Menu Item</DialogTitle>
            <DialogDescription>
              Create a new menu item for {restaurant?.name || 'this restaurant'}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 py-4">
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="name">Item Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Enter item name"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Describe the item and its ingredients"
                rows={2}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => handleInputChange("price", parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => handleInputChange("currency", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="menu">Menu</Label>
              <Select
                value={formData.menu_id}
                onValueChange={(value) => handleInputChange("menu_id", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select menu" />
                </SelectTrigger>
                <SelectContent>
                  {menus.map(menu => (
                    <SelectItem key={menu.id} value={menu.id}>{menu.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => handleInputChange("category_id", value)}
                disabled={!formData.menu_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-8 pt-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_available"
                  checked={formData.is_available}
                  onCheckedChange={(checked) => handleInputChange("is_available", checked)}
                />
                <Label htmlFor="is_available">Available</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_featured"
                  checked={formData.is_featured}
                  onCheckedChange={(checked) => handleInputChange("is_featured", checked)}
                />
                <Label htmlFor="is_featured">Featured</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMenuItem}>
              Add Menu Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Menu Item Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Menu Item</DialogTitle>
            <DialogDescription>
              Update details for this menu item.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 py-4">
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="edit-name">Item Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Enter item name"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Describe the item and its ingredients"
                rows={2}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="edit-price">Price</Label>
                <Input
                  id="edit-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => handleInputChange("price", parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="edit-currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => handleInputChange("currency", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="edit-menu">Menu</Label>
              <Select
                value={formData.menu_id}
                onValueChange={(value) => handleInputChange("menu_id", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select menu" />
                </SelectTrigger>
                <SelectContent>
                  {menus.map(menu => (
                    <SelectItem key={menu.id} value={menu.id}>{menu.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="edit-category">Category</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => handleInputChange("category_id", value)}
                disabled={!formData.menu_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-8 pt-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-is_available"
                  checked={formData.is_available}
                  onCheckedChange={(checked) => handleInputChange("is_available", checked)}
                />
                <Label htmlFor="edit-is_available">Available</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-is_featured"
                  checked={formData.is_featured}
                  onCheckedChange={(checked) => handleInputChange("is_featured", checked)}
                />
                <Label htmlFor="edit-is_featured">Featured</Label>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditMenuItem}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{currentMenuItem?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteMenuItem}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 