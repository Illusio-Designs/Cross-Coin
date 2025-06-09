import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import InputField from './InputField';
import Button from './Button';
import { toast } from 'react-toastify';
import '../../Styles/common/Settings.css';

const Settings = ({ type = 'profile' }) => {
    const { user, updateProfile, updatePassword } = useAuth();
    const [loading, setLoading] = useState(false);
    
    // Profile Settings State
    const [profileData, setProfileData] = useState({
        displayName: user?.displayName || '',
        email: user?.email || '',
        photoURL: user?.photoURL || '',
        phoneNumber: user?.phoneNumber || ''
    });

    // Security Settings State
    const [securityData, setSecurityData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    // Settings State
    const [settings, setSettings] = useState({
        notifications: true,
        emailUpdates: true,
        darkMode: false,
        language: 'english'
    });

    useEffect(() => {
        if (user) {
            setProfileData({
                displayName: user.displayName || '',
                email: user.email || '',
                photoURL: user.photoURL || '',
                phoneNumber: user.phoneNumber || ''
            });
        }
    }, [user]);

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await updateProfile(profileData);
            toast.success('Profile updated successfully');
        } catch (error) {
            toast.error(error.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handleSecuritySubmit = async (e) => {
        e.preventDefault();
        if (securityData.newPassword !== securityData.confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }
        setLoading(true);
        try {
            await updatePassword(securityData.currentPassword, securityData.newPassword);
            toast.success('Password updated successfully');
            setSecurityData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
        } catch (error) {
            toast.error(error.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    const handleSettingChange = (setting, value) => {
        setSettings(prev => ({
            ...prev,
            [setting]: value
        }));
    };

    const renderProfileSettings = () => (
        <form onSubmit={handleProfileSubmit} className="settings-form">
            <div className="form-group">
                <InputField
                    label="Display Name"
                    value={profileData.displayName}
                    onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                />
            </div>
            <div className="form-group">
                <InputField
                    label="Email"
                    type="email"
                    value={profileData.email}
                    disabled
                />
            </div>
            <div className="form-group">
                <InputField
                    label="Phone Number"
                    value={profileData.phoneNumber}
                    onChange={(e) => setProfileData({ ...profileData, phoneNumber: e.target.value })}
                />
            </div>
            <div className="form-group">
                <InputField
                    label="Profile Picture URL"
                    value={profileData.photoURL}
                    onChange={(e) => setProfileData({ ...profileData, photoURL: e.target.value })}
                />
            </div>
            <Button type="submit" disabled={loading}>
                {loading ? 'Updating...' : 'Update Profile'}
            </Button>
        </form>
    );

    const renderSecuritySettings = () => (
        <form onSubmit={handleSecuritySubmit} className="settings-form">
            <div className="form-group">
                <InputField
                    label="Current Password"
                    type="password"
                    value={securityData.currentPassword}
                    onChange={(e) => setSecurityData({ ...securityData, currentPassword: e.target.value })}
                    required
                />
            </div>
            <div className="form-group">
                <InputField
                    label="New Password"
                    type="password"
                    value={securityData.newPassword}
                    onChange={(e) => setSecurityData({ ...securityData, newPassword: e.target.value })}
                    required
                />
            </div>
            <div className="form-group">
                <InputField
                    label="Confirm New Password"
                    type="password"
                    value={securityData.confirmPassword}
                    onChange={(e) => setSecurityData({ ...securityData, confirmPassword: e.target.value })}
                    required
                />
            </div>
            <Button type="submit" disabled={loading}>
                {loading ? 'Updating...' : 'Update Password'}
            </Button>
        </form>
    );

    return (
        <div className="settings-container">
            <h2 className="dashboard-title">
                {type === 'profile' ? 'Profile Settings' : 'Security Settings'}
            </h2>
            <div className="settings-content">
                {type === 'profile' ? renderProfileSettings() : renderSecuritySettings()}
            </div>
        </div>
    );
};

export default Settings; 