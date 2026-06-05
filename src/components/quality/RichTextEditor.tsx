import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
} from "lucide-react";

interface RichTextEditorProps {
  value?: any;
  onChange?: (json: any, html: string) => void;
  editable?: boolean;
  placeholder?: string;
}

export const RichTextEditor = ({ value, onChange, editable = true }: RichTextEditorProps) => {
  const editor = useEditor({
    extensions: [StarterKit, Underline, Link.configure({ openOnClick: false })],
    content: value || "",
    editable,
    onUpdate({ editor }) {
      onChange?.(editor.getJSON(), editor.getHTML());
    },
  });

  if (!editor) return null;

  const Btn = ({
    onClick,
    active,
    children,
    title,
  }: {
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="sm"
      onClick={onClick}
      title={title}
      className="h-8 w-8 p-0"
    >
      {children}
    </Button>
  );

  return (
    <div className="border rounded-md bg-background">
      {editable && (
        <div className="flex flex-wrap items-center gap-1 border-b p-2 sticky top-0 bg-background z-10">
          <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Negrito">
            <Bold className="h-4 w-4" />
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Itálico">
            <Italic className="h-4 w-4" />
          </Btn>
          <Btn
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive("underline")}
            title="Sublinhado"
          >
            <UnderlineIcon className="h-4 w-4" />
          </Btn>
          <Separator orientation="vertical" className="h-6" />
          <Btn
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive("heading", { level: 1 })}
            title="Título 1"
          >
            <Heading1 className="h-4 w-4" />
          </Btn>
          <Btn
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive("heading", { level: 2 })}
            title="Título 2"
          >
            <Heading2 className="h-4 w-4" />
          </Btn>
          <Separator orientation="vertical" className="h-6" />
          <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Lista">
            <List className="h-4 w-4" />
          </Btn>
          <Btn
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive("orderedList")}
            title="Lista numerada"
          >
            <ListOrdered className="h-4 w-4" />
          </Btn>
          <Btn
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive("blockquote")}
            title="Citação"
          >
            <Quote className="h-4 w-4" />
          </Btn>
          <Btn
            onClick={() => {
              const url = window.prompt("URL do link");
              if (url) editor.chain().focus().setLink({ href: url }).run();
            }}
            active={editor.isActive("link")}
            title="Link"
          >
            <LinkIcon className="h-4 w-4" />
          </Btn>
          <Separator orientation="vertical" className="h-6" />
          <Btn onClick={() => editor.chain().focus().undo().run()} title="Desfazer">
            <Undo className="h-4 w-4" />
          </Btn>
          <Btn onClick={() => editor.chain().focus().redo().run()} title="Refazer">
            <Redo className="h-4 w-4" />
          </Btn>
        </div>
      )}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-4 min-h-[400px] focus:outline-none [&_*:focus]:outline-none"
      />
    </div>
  );
};
