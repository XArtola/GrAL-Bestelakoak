import React from "react";
import {connectDB} from '@/utils/mongoose';
import Task from '@/models/Task';
import TaskCard from '@/components/TaskCard';

async function loadTasks(){
  connectDB();
  const tasks = await Task.find();
  return tasks;
}

async function HomePage(){
    const tasks = await loadTasks();
    return (
        <div className="grid grid-cols-3 gap-2">
            {tasks.map((task) => (
              <TaskCard task={task} key={task._id}/>
            ))}
            
        </div>
    );
}

export default HomePage;