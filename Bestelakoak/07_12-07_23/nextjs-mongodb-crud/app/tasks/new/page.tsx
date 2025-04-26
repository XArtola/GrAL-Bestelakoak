"use client";

import React, { ChangeEvent, FormEvent, useState, useEffect, use } from "react";
import { useRouter, useParams } from 'next/navigation';

function FormPage() {

    const [newTask, setNewTask] = useState({
        title: "",
        description: ""
    });

    const router = useRouter();
    const params = useParams();


    const getTask = async () => {
        const res = await fetch(`/api/tasks/${params.id}`);
        const data = await res.json();
        console.log(data);
        setNewTask({
            title: data.title,
            description: data.description
        });
    }

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setNewTask({ ...newTask, [e.target.name]: e.target.value });
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!params.id) {
            await createTask();
        } else {
            await updateTask();
        }
    }
    const updateTask = async () => {

        try {
            await fetch(`/api/tasks/${params.id}`, {

                method: "PUT",
                body: JSON.stringify(newTask),
                headers: {
                    "Content-Type": "application/json"
                }
            })
            router.push("/");
            router.refresh();
        }
        catch (error) {
            console.log(error);
        }
    }

    const handleDelete = async () => {
        console.log("delete");
        if (window.confirm("Are you sure you want to delete this task?")) {
            const res = await fetch(`/api/tasks/${params.id}`, {
                method: "DELETE"
            });

            router.push("/");
            router.refresh();

        }
    }


    useEffect(() => {
        if (params.id) {
            getTask();
        }
    }, []);

    const createTask = async () => {
        try {
            const res = await fetch("/api/tasks", {
                method: "POST",
                body: JSON.stringify(newTask),
                headers: {
                    "Content-Type": "application/json"
                }
            });
            const data = await res.json();
            if (res.status === 200) {
                router.push("/");
                router.refresh();
            }


            console.log(data);

        }
        catch (error) {
            console.log(error);
        }
    }

    return (
        <div className="h-[calc(100vh-7rem)] flex justify-center items-center">
            <form onSubmit={handleSubmit}>
                <header className="flex justify-between">
                    <h1>
                        {params.id ? "Edit Task" : "Create Task"}
                    </h1>

                    <button type="button" className="bg-red-500 px-3 py-1 rounded-md" onClick={handleDelete}>Delete</button>
                </header>
                <input type="text" name="title" placeholder="title"
                    className="bg-gray-800 border-2 w-full p-4 rounded-lg my-4"
                    onChange={handleChange}
                    value={newTask.title} />
                <textarea name="description" placeholder="description"
                    className="bg-gray-800 border-2 w-full p-4 rounded-lg my-4"
                    rows={3}
                    onChange={handleChange}
                    value={newTask.description}></textarea>

                <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-lg">
                    {
                        params.id ? "Edit Task" : "Create Task"
                    }
                </button>
            </form>
        </div>
    );
};

export default FormPage;