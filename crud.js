// crud.js

import { db } from './firebase.js';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const novelsCollection = collection(db, 'novels');

// CREATE
export const addNovel = async (novelData) => {
  try {
    const docRef = await addDoc(novelsCollection, novelData);
    console.log("Document written with ID: ", docRef.id);
    return docRef.id;
  } catch (e) {
    console.error("Error adding document: ", e);
  }
};

// READ
export const getNovels = async () => {
  try {
    const querySnapshot = await getDocs(novelsCollection);
    const novels = [];
    querySnapshot.forEach((doc) => {
      novels.push({ id: doc.id, ...doc.data() });
    });
    return novels;
  } catch (e) {
    console.error("Error getting documents: ", e);
    return [];
  }
};

// UPDATE
export const updateNovel = async (id, updatedData) => {
  try {
    const novelDoc = doc(db, 'novels', id);
    await updateDoc(novelDoc, updatedData);
    console.log("Document updated");
  } catch (e) {
    console.error("Error updating document: ", e);
  }
};

// DELETE
export const deleteNovel = async (id) => {
  try {
    const novelDoc = doc(db, 'novels', id);
    await deleteDoc(novelDoc);
    console.log("Document deleted");
  } catch (e) {
    console.error("Error deleting document: ", e);
  }
};