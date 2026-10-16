# Runs in GitHub Actions after scripts/ios-setup.py.
# Adds MainViewController.swift (fullscreen / home-bar settings) and the privacy manifest to the Xcode project.
# Uses the xcodeproj library that comes with CocoaPods.
require 'xcodeproj'

project = Xcodeproj::Project.open('ios/App/App.xcodeproj')
target = project.targets.find { |t| t.name == 'App' } or abort('App target not found')
group = project.main_group.find_subpath('App', false) or abort('App group not found')

unless group.files.any? { |f| f.path == 'MainViewController.swift' }
  ref = group.new_reference('MainViewController.swift')
  target.add_file_references([ref])
end
unless group.files.any? { |f| f.path == 'PrivacyInfo.xcprivacy' }
  pref = group.new_reference('PrivacyInfo.xcprivacy')
  target.resources_build_phase.add_file_reference(pref)
end
project.save
puts 'MainViewController.swift + PrivacyInfo.xcprivacy added to the App target'
