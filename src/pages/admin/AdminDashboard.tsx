import { Link } from 'react-router-dom';
import { useInitiatives } from '@/hooks/useInitiatives';
import { usePartners } from '@/hooks/usePartners';
import { useProducts } from '@/hooks/useProducts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Rocket, 
  Building2, 
  Package, 
  Users,
  ArrowRight,
  TrendingUp
} from 'lucide-react';

const AdminDashboard = () => {
  const { data: initiatives } = useInitiatives();
  const { data: partners } = usePartners();
  const { data: products } = useProducts(true);

  const stats = [
    {
      title: 'Total Initiatives',
      value: initiatives?.length || 0,
      description: 'Digital initiatives',
      icon: Rocket,
      href: '/admin/initiatives',
    },
    {
      title: 'Active Partners',
      value: partners?.filter(p => p.status === 'active').length || 0,
      description: `of ${partners?.length || 0} total`,
      icon: Building2,
      href: '/admin/partners',
    },
    {
      title: 'Products',
      value: products?.filter(p => p.is_active).length || 0,
      description: 'Active products',
      icon: Package,
      href: '/admin/initiatives',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage digital initiatives, partners, and products
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
              <Button variant="link" className="px-0 mt-2" asChild>
                <Link to={stat.href}>
                  View all
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest updates to the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {initiatives?.slice(0, 5).map((initiative) => (
                <div key={initiative.id} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                    <Rocket className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{initiative.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Updated {new Date(initiative.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              {(!initiatives || initiatives.length === 0) && (
                <p className="text-sm text-muted-foreground">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/admin/initiatives/new">
                <Rocket className="mr-2 h-4 w-4" />
                Create New Initiative
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/admin/partners/new">
                <Building2 className="mr-2 h-4 w-4" />
                Add New Partner
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/admin/initiatives">
                <Package className="mr-2 h-4 w-4" />
                Manage Initiatives
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
