import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import {
  useQualityOrgChart,
  type OrgChartNode,
} from "@/hooks/useQualityOrgChart";
import { useCompanyUsers } from "@/hooks/useCompanyUsers";
import { useDepartments } from "@/hooks/useDepartments";

interface NodeWithChildren extends OrgChartNode {
  children: NodeWithChildren[];
}

const buildTree = (rows: OrgChartNode[]): NodeWithChildren[] => {
  const map = new Map<string, NodeWithChildren>();
  rows.forEach((r) => map.set(r.id, { ...r, children: [] }));
  const roots: NodeWithChildren[] = [];
  map.forEach((n) => {
    if (n.parent_id && map.has(n.parent_id)) {
      map.get(n.parent_id)!.children.push(n);
    } else {
      roots.push(n);
    }
  });
  return roots;
};

const NodeForm = ({
  node,
  nodes,
  onClose,
}: {
  node?: OrgChartNode;
  nodes: OrgChartNode[];
  onClose: () => void;
}) => {
  const { upsert } = useQualityOrgChart();
  const { data: users = [] } = useCompanyUsers();
  const { departments } = useDepartments();
  const [form, setForm] = useState({
    title: node?.title ?? "",
    parent_id: node?.parent_id ?? "",
    user_id: node?.user_id ?? "",
    department_id: node?.department_id ?? "",
    responsibilities: node?.responsibilities ?? "",
    authority: node?.authority ?? "",
    order_index: node?.order_index ?? 0,
    active: node?.active ?? true,
  });

  const submit = async () => {
    if (!form.title.trim()) return;
    await upsert.mutateAsync({
      id: node?.id,
      title: form.title.trim(),
      parent_id: form.parent_id || null,
      user_id: form.user_id || null,
      department_id: form.department_id || null,
      responsibilities: form.responsibilities || null,
      authority: form.authority || null,
      order_index: Number(form.order_index) || 0,
      active: form.active,
    } as any);
    onClose();
  };

  return (
    <div className="space-y-3">
      <div>
        <Label>Cargo / Função *</Label>
        <Input
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="Ex: Diretor de Qualidade"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Responde a</Label>
          <Select
            value={form.parent_id || "none"}
            onValueChange={(v) =>
              setForm((f) => ({ ...f, parent_id: v === "none" ? "" : v }))
            }
          >
            <SelectTrigger><SelectValue placeholder="Topo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Topo —</SelectItem>
              {nodes
                .filter((n) => n.id !== node?.id)
                .map((n) => (
                  <SelectItem key={n.id} value={n.id}>{n.title}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Ordem</Label>
          <Input
            type="number"
            value={form.order_index}
            onChange={(e) =>
              setForm((f) => ({ ...f, order_index: Number(e.target.value) }))
            }
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Titular</Label>
          <Select
            value={form.user_id || "none"}
            onValueChange={(v) =>
              setForm((f) => ({ ...f, user_id: v === "none" ? "" : v }))
            }
          >
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Vago —</SelectItem>
              {users.map((u: any) => (
                <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Departamento</Label>
          <Select
            value={form.department_id || "none"}
            onValueChange={(v) =>
              setForm((f) => ({ ...f, department_id: v === "none" ? "" : v }))
            }
          >
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Nenhum —</SelectItem>
              {departments.map((d: any) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Responsabilidades</Label>
        <Textarea
          rows={3}
          value={form.responsibilities}
          onChange={(e) =>
            setForm((f) => ({ ...f, responsibilities: e.target.value }))
          }
        />
      </div>
      <div>
        <Label>Autoridade</Label>
        <Textarea
          rows={2}
          value={form.authority}
          onChange={(e) =>
            setForm((f) => ({ ...f, authority: e.target.value }))
          }
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={submit}>Salvar</Button>
      </DialogFooter>
    </div>
  );
};

const TreeNode = ({
  node,
  nodes,
  depth = 0,
  userMap,
}: {
  node: NodeWithChildren;
  nodes: OrgChartNode[];
  depth?: number;
  userMap: Map<string, string>;
}) => {
  const [editing, setEditing] = useState(false);
  const { remove } = useQualityOrgChart();
  return (
    <div className="space-y-2">
      <div
        className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-card"
        style={{ marginLeft: depth * 24 }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{node.title}</span>
            {!node.active && <Badge variant="secondary">inativo</Badge>}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {node.user_id
              ? userMap.get(node.user_id) ?? "Titular"
              : "— vago —"}
          </div>
          {node.responsibilities && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
              <b>Responsabilidades:</b> {node.responsibilities}
            </p>
          )}
          {node.authority && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              <b>Autoridade:</b> {node.authority}
            </p>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <Dialog open={editing} onOpenChange={setEditing}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar posição</DialogTitle>
              </DialogHeader>
              <NodeForm
                node={node}
                nodes={nodes}
                onClose={() => setEditing(false)}
              />
            </DialogContent>
          </Dialog>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              if (confirm("Remover esta posição?")) remove.mutate(node.id);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {node.children.map((c) => (
        <TreeNode
          key={c.id}
          node={c}
          nodes={nodes}
          depth={depth + 1}
          userMap={userMap}
        />
      ))}
    </div>
  );
};

const OrgChart = () => {
  const { items, isLoading } = useQualityOrgChart();
  const { data: users = [] } = useCompanyUsers();
  const [creating, setCreating] = useState(false);

  const tree = useMemo(() => buildTree(items), [items]);
  const userMap = useMemo(
    () => new Map(users.map((u: any) => [u.id, u.full_name])),
    [users],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6" />
            Organograma & Liderança
          </h2>
          <p className="text-muted-foreground text-sm">
            Estrutura organizacional, responsabilidades e autoridades do SGQ.
          </p>
        </div>
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" />Nova posição</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova posição</DialogTitle>
            </DialogHeader>
            <NodeForm nodes={items} onClose={() => setCreating(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hierarquia</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : tree.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma posição cadastrada. Comece pelo topo da organização.
            </p>
          ) : (
            <div className="space-y-2">
              {tree.map((n) => (
                <TreeNode
                  key={n.id}
                  node={n}
                  nodes={items}
                  userMap={userMap}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OrgChart;
