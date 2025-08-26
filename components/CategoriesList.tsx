import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function CategoriesList() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string|null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newColor, setNewColor] = useState("#6EE7B7");
  const [newIcon, setNewIcon] = useState("Tag");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) {
      fetchCategories();
    }
  }, [user]);

  async function fetchCategories() {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true });
    if (!error && data) setCategories(data);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    await supabase.from('categories').delete().eq('id', id);
    fetchCategories();
  }

  function startEdit(cat: any) {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditDescription(cat.description || "");
  }

  async function handleEditSave(id: string) {
  await supabase.from('categories').update({ name: editName }).eq('id', id);
    setEditingId(null);
    fetchCategories();
  }

  async function handleAddCategory() {
    // Forzar la actualización de la sesión para obtener el user_id más reciente
    const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();

    if (sessionError || !session) {
      console.error('Error refreshing session:', sessionError);
      alert('No se pudo verificar tu sesión. Por favor, inicia sesión de nuevo.');
      return;
    }

    const currentUser = session.user;

    if (!newName.trim() || !currentUser || !currentUser.id) {
      alert("El nombre de la categoría es obligatorio y debes estar conectado.");
      return;
    }

    const { data, error } = await supabase.from('categories').insert({
      name: newName,
      user_id: currentUser.id,
      color: newColor,
      icon: newIcon
    }).select();

    if (error) {
      console.error('Error adding category:', error, 'user_id:', currentUser.id);
      alert(`Error al añadir la categoría: ${error.message}\nuser_id: ${currentUser.id}`);
      return;
    }

    setNewName("");
    setNewDescription("");
    setNewColor("#6EE7B7");
    setNewIcon("Tag");
    fetchCategories();
  }

  if (loading) return <div className="text-gray-500">Cargando categorías...</div>;
  return (
    <div>
      <ul className="divide-y divide-gray-200 mb-6">
        {categories.map(cat => (
          <li key={cat.id} className="py-3 flex justify-between items-center">
            {editingId === cat.id ? (
              <div className="flex-1 flex flex-col md:flex-row gap-2">
                <input value={editName} onChange={e => setEditName(e.target.value)} className="input" />
                <input value={editDescription} onChange={e => setEditDescription(e.target.value)} className="input" />
                <button className="btn-primary" onClick={() => handleEditSave(cat.id)}>Guardar</button>
                <button className="btn-secondary" onClick={() => setEditingId(null)}>Cancelar</button>
              </div>
            ) : (
              <>
                <span className="font-medium text-gray-900">{cat.name}</span>
                <span className="text-xs text-gray-500 ml-2">{cat.description || ''}</span>
                <button className="btn-secondary ml-2" onClick={() => startEdit(cat)}>Editar</button>
                <button className="btn-danger ml-2" onClick={() => handleDelete(cat.id)}>Eliminar</button>
              </>
            )}
          </li>
        ))}
      </ul>
      <div className="flex flex-col md:flex-row gap-2 items-center">
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nueva categoría" className="input" />
        <input value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Descripción" className="input" />
        <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} className="input w-12 h-12 p-0 border-none" title="Color" />
        <select value={newIcon} onChange={e => setNewIcon(e.target.value)} className="input">
          <option value="Tag">🏷️ Tag</option>
          <option value="ShoppingCart">🛒 Shopping</option>
          <option value="Utensils">🍽️ Food</option>
          <option value="Home">🏠 Home</option>
          <option value="Car">🚗 Car</option>
          <option value="Heart">❤️ Health</option>
          <option value="Gift">🎁 Gift</option>
        </select>
        <button className="btn-primary" onClick={handleAddCategory}>Agregar</button>
      </div>
    </div>
  );
}
