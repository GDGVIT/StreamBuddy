import { useEffect, useState } from "react"
import Auth from "./components/Auth"
import Dashboard from "./components/Dashboard"
import './index.css'

export default function App(){
    const [user, setUser] = useState(null)
    const [currentStage, setCurrentStage] = useState(null)

    useEffect(() => {
        window.electronAPI.onStageUpdate((event, stage) => {
            setCurrentStage(stage)
        })
    }, [])

    return(
        <>
            {user 
                ? <Dashboard user={user} currentStage={currentStage} /> 
                : <Auth onAuthSuccess={setUser}/>
            }
        </>
    )
}