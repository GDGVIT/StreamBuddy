import React, { useState } from 'react'
import supabase from '../lib/supabase'

function LoginForm({ isLogin, onLoginSuccess, onToggleView }){
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [confirm, setConfirm] = useState(false)

    async function handleSubmit(e){
        e.preventDefault()
        if (!email || !password){
            alert('Please fill in both your email and password!')
            return
        }

        let data, error

        try{
            setLoading(true)
            if (isLogin){
                ({ data, error } = await supabase.auth.signInWithPassword({email, password}))
            }
            else{
                ({ data, error } = await supabase.auth.signUp({email, password}))
            }

            if (error){
                alert(error.message)
                return
            }

            if (data.session){
                onLoginSuccess(data.user)
            }
            else{
                setConfirm(true)
                alert("Please confirm your email!")
            }
        }
        catch(err){
            alert("Something went wrong. Please try again.")
        }
        finally{    
            setLoading(false)
        }
    }

    return(
        <>
            {confirm && <div> <h3>Please confirm your email!</h3> </div>}
            <form onSubmit={handleSubmit}>
                <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                />

                <div className="password-container">
                    <input
                    type={showPassword ? "text" : "password"}
                    value={password} 
                    onChange={e => setPassword(e.target.value)}
                    />

                    <button type="button" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? "Hide" : "Show"}
                    </button>
                </div>

                <button type="submit" disabled={loading}>{isLogin ? "Login" : "Sign Up"}</button>
                <p onClick={onToggleView}>{isLogin ? "New to StreamBuddy? Sign up!" : "Returning user? Log In!"}</p>
            </form>
        </>
    )
}

export default function Auth(){
    const [isLogin, setIsLogin] = useState(true)
    const [user, setUser] = useState(null)

    function toggleView(){
        setIsLogin(!isLogin)
    }

    if(user){
        return(
            <h1>Welcome, {user.email}</h1>
        )
    }

    
    return(
        <LoginForm isLogin={isLogin} onToggleView={toggleView} onLoginSuccess={setUser} />
    )
}