import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useInitiatives, useSubInitiatives } from '@/hooks/useInitiatives';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Users, ArrowRight, Loader2, ChevronRight, Layers, ArrowLeft, FolderOpen } from 'lucide-react';

// Sub-initiatives shown when a main category is selected
const SubInitiativeList = ({
  parentId,
  parentName,
  onBack,
}: {
  parentId: string;
  parentName: string;
  onBack: () => void;
}) => {
  const { data: subs, isLoading } = useSubInitiatives(parentId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[30vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button
          onClick={onBack}
          className="flex items-center gap-1 hover:text-foreground transition-colors font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          All Categories
        </button>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-semibold">{parentName}</span>
      </div>

      {/* Sub-initiative heading */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">{parentName}</h2>
        <p className="text-muted-foreground mt-1">
          Select an initiative to view partner integrations
        </p>
      </div>

      {subs && subs.length > 0 ? (
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 items-stretch">
          {[...subs]
            .sort((a, b) => (b.initiative_partners?.length || 0) - (a.initiative_partners?.length || 0))
            .map((sub) => (
            <Link key={sub.id} to={`/initiatives/${sub.id}`} className="flex">
              <div className="group relative bg-card border border-border/60 rounded-xl p-5 hover:border-primary/50 hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col w-full">
                {/* Colored left accent bar */}
                <div className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full bg-primary opacity-60 group-hover:opacity-100 transition-opacity" />

                <div className="pl-3 flex flex-col flex-1 gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors leading-tight">
                      {sub.name}
                    </h3>
                    <Badge
                      variant={sub.status === 'active' ? 'default' : 'secondary'}
                      className={`shrink-0 text-xs ${sub.status === 'active' ? 'bg-primary/90' : ''}`}
                    >
                      {sub.status}
                    </Badge>
                  </div>

                  <div className="flex-1">
                    {sub.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{sub.description}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 mt-auto border-t border-border/40">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span>{sub.initiative_partners?.length || 0} Partner{(sub.initiative_partners?.length || 0) !== 1 ? 's' : ''}</span>
                    </div>
                    <span className="text-xs font-medium text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                      View Details
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[30vh] text-center border-2 border-dashed border-border rounded-xl py-16">
          <Layers className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-lg font-medium text-muted-foreground">No initiatives yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Initiatives for {parentName} will appear here
          </p>
        </div>
      )}
    </div>
  );
};

// Main category card — click to drill into sub-initiatives
const CategoryCard = ({
  initiative,
  onClick,
}: {
  initiative: any;
  onClick: () => void;
}) => {
  return (
    <div
      onClick={onClick}
      className="group relative bg-card border border-border/60 rounded-xl overflow-hidden hover:border-primary/50 hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col h-full"
    >
      {/* Top gradient strip */}
      <div className="h-2 w-full bg-gradient-to-r from-primary to-secondary shrink-0" />

      <div className="p-6 flex flex-col flex-1 gap-4">
        {/* Icon + Name */}
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center shrink-0">
            <FolderOpen className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors leading-tight">
              {initiative.name}
            </h3>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">Main Category</p>
          </div>
          <Badge
            variant={initiative.status === 'active' ? 'default' : 'secondary'}
            className={`shrink-0 ${initiative.status === 'active' ? 'bg-primary/90' : ''}`}
          >
            {initiative.status}
          </Badge>
        </div>

        <div className="flex-1">
          {initiative.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{initiative.description}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-border/50 mt-auto">
          <span className="text-sm font-semibold text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
            Explore Initiatives
            <ChevronRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </div>
  );
};

// Standalone initiative card — click goes directly to detail
const InitiativeCard = ({ initiative }: { initiative: any }) => {
  const partnerCount = initiative.initiative_partners?.length || 0;
  return (
    <Link to={`/initiatives/${initiative.id}`} className="flex">
      <div className="group relative bg-card border border-border/60 rounded-xl overflow-hidden hover:border-primary/50 hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col w-full">
        {/* Top gradient strip */}
        <div className="h-2 w-full bg-gradient-to-r from-secondary to-primary shrink-0" />

        <div className="p-6 flex flex-col flex-1 gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-secondary/20 to-primary/20 flex items-center justify-center shrink-0">
              <Layers className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors leading-tight">
                {initiative.name}
              </h3>
            </div>
            <Badge
              variant={initiative.status === 'active' ? 'default' : 'secondary'}
              className={`shrink-0 ${initiative.status === 'active' ? 'bg-primary/90' : ''}`}
            >
              {initiative.status}
            </Badge>
          </div>

          <div className="flex-1">
            {initiative.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{initiative.description}</p>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border/50 mt-auto">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{partnerCount} Partner{partnerCount !== 1 ? 's' : ''}</span>
            </div>
            <span className="text-sm font-semibold text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
              View Details
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

const Index = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedParent, setSelectedParent] = useState<{ id: string; name: string } | null>(null);

  // Fetch ALL top-level items (parent_id = null)
  const { data: allTopLevel, isLoading, error } = useInitiatives({
    status: statusFilter,
    search: search,
    parentId: null,
  });

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-destructive">Failed to load initiatives. Please try again.</p>
      </div>
    );
  }

  if (selectedParent) {
    return (
      <SubInitiativeList
        parentId={selectedParent.id}
        parentName={selectedParent.name}
        onBack={() => setSelectedParent(null)}
      />
    );
  }

  // Separate main categories (have children) from standalone initiatives
  // We show ALL top-level items; categories get a drill-down, standalone goes directly
  // A "main category" is one created via the Categories form — they typically have no partners directly
  // A "standalone initiative" typically has partners directly and no children expected
  // We distinguish by checking if they were meant as categories (we use the absence of initiative_partners to hint,
  // but better: we show BOTH on the same page — categories with FolderOpen, initiatives with Layers icon)
  // The admin controls this via the "Add Main Category" vs "Add Initiative" flow.
  // Both use parent_id=null, so we show all of them and let the click behavior differ:
  // - If an item has sub-initiatives (children), clicking drills down
  // - If not, clicking goes directly to the initiative detail

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search initiatives..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px] bg-card">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : allTopLevel && allTopLevel.length > 0 ? (
        <PortalGrid
          items={allTopLevel}
          onCategoryClick={(id, name) => setSelectedParent({ id, name })}
        />
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <Layers className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-lg text-muted-foreground mb-2">No initiatives found</p>
          <p className="text-sm text-muted-foreground">
            {search ? 'Try adjusting your search or filters' : 'Check back later for new initiatives'}
          </p>
        </div>
      )}
    </div>
  );
};

// Smart grid: checks each top-level item for sub-initiatives
const PortalGrid = ({
  items,
  onCategoryClick,
}: {
  items: any[];
  onCategoryClick: (id: string, name: string) => void;
}) => {
  // We fetch sub-initiatives for all items at once to know which ones have children
  // Use a helper hook to check — but since we can't call hooks conditionally in a loop,
  // we instead show items with initiative_partners = 0 AND we determine category vs standalone
  // by whether they have direct partners or not. A pure category has 0 direct partners.
  // But an initiative can also have 0 partners. So we show ALL as clickable:
  // - No direct partners → treat as category (drill-down, but if no subs, show empty state inside)
  // - Has direct partners → treat as standalone (go directly to detail)
  // This gives the best UX without extra queries.

  // Items with partners first, items without partners at the bottom
  const sortedItems = [...items].sort((a, b) => {
    const aHas = (a.initiative_partners?.length || 0) > 0 ? 1 : 0;
    const bHas = (b.initiative_partners?.length || 0) > 0 ? 1 : 0;
    return bHas - aHas;
  });

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 items-stretch">
      {sortedItems.map((item) => {
        const hasDirectPartners = (item.initiative_partners?.length || 0) > 0;
        if (hasDirectPartners) {
          return <InitiativeCard key={item.id} initiative={item} />;
        } else {
          return (
            <CategoryCard
              key={item.id}
              initiative={item}
              onClick={() => onCategoryClick(item.id, item.name)}
            />
          );
        }
      })}
    </div>
  );
};

export default Index;
